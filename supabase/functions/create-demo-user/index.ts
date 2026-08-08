import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticate, hasAnyRole, unauthorized, forbidden } from '../_shared/authGuard.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Somente superadmin pode provisionar/reconfigurar o usuário demo
  const auth = await authenticate(req)
  if (!auth) return unauthorized(corsHeaders)
  if (!hasAnyRole(auth, ['superadmin'])) return forbidden(corsHeaders)

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const email = 'demo@gsatibiri.com.br'
    const password = 'demo123456'

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      const userId = existingUser.id

      // Ensure demo user has correct profile setup
      await supabaseAdmin
        .from('profiles')
        .update({ is_demo: true })
        .eq('id', userId)

      // Ensure admin role exists
      const { data: existingRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (!existingRoles || existingRoles.length === 0) {
        await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' })
      }

      // Ensure module access
      const { data: modules } = await supabaseAdmin
        .from('modulos')
        .select('id')
        .eq('ativo', true)

      if (modules) {
        for (const mod of modules) {
          await supabaseAdmin
            .from('user_modulos')
            .upsert({
              user_id: userId,
              modulo_id: mod.id,
              nivel_acesso: 'full',
              permitido: true,
              integrado_id: userId
            }, { onConflict: 'user_id,modulo_id' })
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Demo user configured', userId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create demo user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuário Demo'
      }
    })

    if (userError) throw userError

    const userId = userData.user.id

    // Mark profile as demo
    await supabaseAdmin
      .from('profiles')
      .update({ is_demo: true })
      .eq('id', userId)

    // Create admin role
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' })

    // Grant access to all modules
    const { data: modules } = await supabaseAdmin
      .from('modulos')
      .select('id')
      .eq('ativo', true)

    if (modules) {
      for (const mod of modules) {
        await supabaseAdmin
          .from('user_modulos')
          .upsert({
            user_id: userId,
            modulo_id: mod.id,
            nivel_acesso: 'full',
            permitido: true,
            integrado_id: userId
          }, { onConflict: 'user_id,modulo_id' })
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
