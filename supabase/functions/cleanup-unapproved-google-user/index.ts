import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limpa do auth.users o próprio usuário recém-logado via OAuth que ainda
// não tem profile (não foi aprovado). Evita órfãos.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supaUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supaUser.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const uid = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Só apaga se NÃO tem profile (garantia de que não é usuário aprovado)
    const { data: profile } = await admin.from('profiles').select('id').eq('id', uid).maybeSingle();
    if (profile) {
      return new Response(JSON.stringify({ skipped: true, reason: 'profile_exists' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      await admin.from('security_definer_audit_log').insert({
        user_id: uid,
        function_name: 'cleanup-unapproved-google-user',
        key_param: uid,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'erro inesperado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
