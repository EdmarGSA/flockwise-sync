import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
}

// Structured logger with consistent JSON output for easy filtering
function logEvent(level: 'info' | 'warn' | 'error', requestId: string, event: string, data: Record<string, unknown> = {}) {
  const entry = {
    level,
    request_id: requestId,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

// Mask email for logs while keeping enough info for correlation
function maskEmail(email: string): string {
  if (!email) return ''
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  const visible = user.length <= 2 ? user[0] : user.slice(0, 2)
  return `${visible}***@${domain}`
}

Deno.serve(async (req) => {
  // Correlation id: prefer header, fallback to generated uuid
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const startedAt = Date.now()

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin client - used for both auth and audit logging (audit table denies non-service-role writes)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Audit helper - never throws, never blocks main flow
  const writeAudit = async (entry: {
    target_email: string
    integrado_id: string | null
    requested_by: string | null
    status: 'success' | 'error' | 'retry'
    error_type?: string | null
    error_message?: string | null
    attempt?: number
    max_attempts?: number
    created_user_id?: string | null
    metadata?: Record<string, unknown>
  }) => {
    try {
      const { error } = await supabaseAdmin.from('create_user_audit_log' as any).insert({
        request_id: requestId,
        target_email: entry.target_email,
        integrado_id: entry.integrado_id,
        requested_by: entry.requested_by,
        status: entry.status,
        error_type: entry.error_type ?? null,
        error_message: entry.error_message ?? null,
        attempt: entry.attempt ?? 1,
        max_attempts: entry.max_attempts ?? 1,
        created_user_id: entry.created_user_id ?? null,
        metadata: entry.metadata ?? {},
      })
      if (error) {
        logEvent('warn', requestId, 'audit_write_failed', { error: error.message })
      }
    } catch (e) {
      logEvent('warn', requestId, 'audit_write_exception', { error: String(e) })
    }
  }

  let parsedEmail = ''
  let parsedIntegradoId: string | null = null
  let requestingUserId: string | null = null

  try {
    logEvent('info', requestId, 'request_received', { method: req.method })

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logEvent('warn', requestId, 'auth_missing')
      return new Response(
        JSON.stringify({ error: 'Não autorizado', request_id: requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      logEvent('warn', requestId, 'auth_invalid', { error: authError?.message })
      return new Response(
        JSON.stringify({ error: 'Não autorizado', request_id: requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    requestingUserId = requestingUser.id

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      logEvent('warn', requestId, 'forbidden_not_admin', { requested_by: requestingUser.id })
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários', request_id: requestId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, full_name, integrado_id } = await req.json()
    parsedEmail = email || ''

    if (!email || !password) {
      logEvent('warn', requestId, 'validation_failed', { reason: 'missing_email_or_password' })
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios', request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve target integrado_id
    let targetIntegradoId = integrado_id
    if (!targetIntegradoId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('integrado_id')
        .eq('id', requestingUser.id)
        .single()
      targetIntegradoId = adminProfile?.integrado_id || requestingUser.id
    }
    parsedIntegradoId = targetIntegradoId

    logEvent('info', requestId, 'create_user_start', {
      email_masked: maskEmail(email),
      integrado_id: targetIntegradoId,
      requested_by: requestingUser.id,
    })

    const tryCreateUser = async () => {
      return await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, integrado_id: targetIntegradoId }
      })
    }

    const isCheckingEmailError = (msg: string) =>
      msg.includes('Database error checking email') || msg.toLowerCase().includes('checking email')

    let data: any = null
    let error: any = null
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await tryCreateUser()
      data = result.data
      error = result.error

      if (!error) break

      logEvent('warn', requestId, 'create_user_attempt_failed', {
        attempt,
        max_attempts: maxAttempts,
        error_message: error.message,
        email_masked: maskEmail(email),
        integrado_id: targetIntegradoId,
      })

      // Retry-only audit entry
      await writeAudit({
        target_email: email,
        integrado_id: targetIntegradoId,
        requested_by: requestingUser.id,
        status: 'retry',
        error_type: isCheckingEmailError(error.message) ? 'checking_email' : 'other',
        error_message: error.message,
        attempt,
        max_attempts: maxAttempts,
      })

      if (isCheckingEmailError(error.message) && attempt < maxAttempts) {
        try {
          const { data: cleanupCount } = await supabaseAdmin.rpc(
            'cleanup_orphan_identities_for_email' as any,
            { p_email: email }
          )
          logEvent('info', requestId, 'cleanup_orphan_identities', {
            deleted: cleanupCount,
            email_masked: maskEmail(email),
          })
        } catch (e) {
          logEvent('warn', requestId, 'cleanup_failed', { error: String(e) })
        }
        await new Promise((r) => setTimeout(r, 500 * attempt))
        continue
      }

      break
    }

    if (error) {
      let errorMessage = error.message
      let errorType = 'other'
      let retryable = false

      if (error.message.includes('already been registered') || error.message.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado'
        errorType = 'already_registered'
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Email inválido'
        errorType = 'invalid_email'
      } else if (error.message.toLowerCase().includes('password')) {
        errorMessage = 'Senha deve ter no mínimo 6 caracteres'
        errorType = 'invalid_password'
      } else if (isCheckingEmailError(error.message)) {
        errorMessage = 'Não conseguimos validar este email no momento. Aguarde alguns segundos e tente reenviar o cadastro.'
        errorType = 'checking_email'
        retryable = true
      }

      logEvent('error', requestId, 'create_user_failed', {
        error_type: errorType,
        error_message: error.message,
        email_masked: maskEmail(email),
        integrado_id: targetIntegradoId,
        requested_by: requestingUser.id,
        retryable,
        duration_ms: Date.now() - startedAt,
      })

      await writeAudit({
        target_email: email,
        integrado_id: targetIntegradoId,
        requested_by: requestingUser.id,
        status: 'error',
        error_type: errorType,
        error_message: error.message,
        attempt: maxAttempts,
        max_attempts: maxAttempts,
        metadata: { retryable, duration_ms: Date.now() - startedAt },
      })

      return new Response(
        JSON.stringify({ error: errorMessage, retryable, request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logEvent('info', requestId, 'create_user_success', {
      created_user_id: data.user?.id,
      email_masked: maskEmail(email),
      integrado_id: targetIntegradoId,
      requested_by: requestingUser.id,
      duration_ms: Date.now() - startedAt,
    })

    await writeAudit({
      target_email: email,
      integrado_id: targetIntegradoId,
      requested_by: requestingUser.id,
      status: 'success',
      created_user_id: data.user?.id ?? null,
      metadata: { duration_ms: Date.now() - startedAt },
    })

    return new Response(
      JSON.stringify({ user: data.user, request_id: requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    logEvent('error', requestId, 'unexpected_error', {
      error_message: error?.message || String(error),
      stack: error?.stack,
      email_masked: maskEmail(parsedEmail),
      integrado_id: parsedIntegradoId,
      requested_by: requestingUserId,
      duration_ms: Date.now() - startedAt,
    })

    if (parsedEmail) {
      await writeAudit({
        target_email: parsedEmail,
        integrado_id: parsedIntegradoId,
        requested_by: requestingUserId,
        status: 'error',
        error_type: 'unexpected',
        error_message: error?.message || String(error),
        metadata: { duration_ms: Date.now() - startedAt },
      })
    }

    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
