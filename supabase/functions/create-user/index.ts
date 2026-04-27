import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .single()

    if (!adminRole) {
      console.error('User is not admin:', requestingUser.id)
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, full_name, integrado_id } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar integrado_id do admin se não foi passado
    let targetIntegradoId = integrado_id
    if (!targetIntegradoId) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('integrado_id')
        .eq('id', requestingUser.id)
        .single()
      targetIntegradoId = adminProfile?.integrado_id || requestingUser.id
    }

    console.log('Creating user with email:', email, 'for org:', targetIntegradoId)

    // Helper: tenta criar usuário com retry automático em erros transitórios
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

      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message)

      // Se for erro de validação de email, tenta limpar identidades órfãs e retry
      if (isCheckingEmailError(error.message) && attempt < maxAttempts) {
        try {
          // Limpa identidades órfãs (sem usuário correspondente) que possam estar
          // bloqueando este email específico
          await supabaseAdmin.rpc('cleanup_orphan_identities_for_email' as any, { p_email: email }).catch(() => {})
        } catch (e) {
          console.warn('Cleanup attempt failed (non-fatal):', e)
        }
        // Backoff: 500ms, 1000ms
        await new Promise((r) => setTimeout(r, 500 * attempt))
        continue
      }

      // Erro não-retryable: sai do loop
      break
    }

    if (error) {
      console.error('Error creating user after retries:', error)

      // Translate common errors
      let errorMessage = error.message
      let retryable = false
      if (error.message.includes('already been registered') || error.message.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado'
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Email inválido'
      } else if (error.message.toLowerCase().includes('password')) {
        errorMessage = 'Senha deve ter no mínimo 6 caracteres'
      } else if (isCheckingEmailError(error.message)) {
        errorMessage = 'Não conseguimos validar este email no momento. Aguarde alguns segundos e tente reenviar o cadastro.'
        retryable = true
      }

      return new Response(
        JSON.stringify({ error: errorMessage, retryable }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', data.user?.id)

    return new Response(
      JSON.stringify({ user: data.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
