import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify that request has authorization header (current user must be authenticated)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Não autorizado', authorized: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify current user is authenticated
    const { data: { user: currentUser }, error: currentUserError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (currentUserError || !currentUser) {
      console.log('Current user not authenticated:', currentUserError?.message)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado', authorized: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios', authorized: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin verification attempt for email: ${email} by user: ${currentUser.id}`)

    // Verify admin credentials using service role (does NOT change current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      console.log('Invalid credentials for admin verification:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Credenciais inválidas', authorized: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the verified user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Error checking admin role:', roleError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões', authorized: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!roleData) {
      console.log(`User ${authData.user.id} does not have admin role`)
      return new Response(
        JSON.stringify({ error: 'Usuário não possui permissão de administrador', authorized: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin verification successful for user: ${authData.user.id}`)

    // Return success - only the boolean result and admin user ID (for audit trail)
    return new Response(
      JSON.stringify({ 
        authorized: true, 
        admin_user_id: authData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in verify-admin-credentials:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', authorized: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
