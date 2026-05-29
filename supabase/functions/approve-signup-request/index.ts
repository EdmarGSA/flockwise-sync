import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Valida superadmin
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', uid).eq('role', 'superadmin').maybeSingle();
    if (!roles) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string;
    if (!id) {
      return new Response(JSON.stringify({ error: 'id obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Lock otimista: pendente → processando
    const { data: locked, error: lockErr } = await admin
      .from('solicitacoes_cadastro')
      .update({ status: 'processando', revisado_por: uid, revisado_em: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pendente')
      .select('*')
      .maybeSingle();

    if (lockErr) {
      return new Response(JSON.stringify({ error: lockErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!locked) {
      return new Response(JSON.stringify({ error: 'Solicitação não está pendente ou já foi processada por outro admin' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const revert = async (reason: string) => {
      await admin.from('solicitacoes_cadastro').update({ status: 'pendente', revisado_por: null, revisado_em: null }).eq('id', id);
      return new Response(JSON.stringify({ error: reason }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    // Checa duplicidade no auth.users (lista paginada)
    try {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const exists = list?.users?.some((u: any) => (u.email || '').toLowerCase() === locked.email.toLowerCase());
      if (exists) return await revert('Já existe usuário com este email');
    } catch (_) { /* não bloqueia */ }

    // Convite
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(locked.email, {
      data: {
        full_name: locked.full_name,
        signup_source: 'approved_request',
      },
    });
    if (inviteErr || !invited?.user) {
      return await revert(`Falha ao convidar: ${inviteErr?.message || 'desconhecido'}`);
    }

    // Atualiza para aprovada
    await admin.from('solicitacoes_cadastro').update({
      status: 'aprovada',
      user_id_criado: invited.user.id,
      integrado_id_criado: invited.user.id,
    }).eq('id', id);

    // Audit
    try {
      await admin.from('security_definer_audit_log').insert({
        user_id: uid,
        function_name: 'approve-signup-request',
        key_param: locked.email,
        extra: { solicitacao_id: id, invited_user_id: invited.user.id },
      });
    } catch (_) { /* ignora */ }

    return new Response(JSON.stringify({ ok: true, user_id: invited.user.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'erro inesperado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
