import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SALESPERSON_PASSWORD = 'Vend123#';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { vendedor_fornecedor_id, email, nome, fornecedor_global_id } = await req.json();

    // Validar campos obrigatórios
    if (!vendedor_fornecedor_id || !email || !nome || !fornecedor_global_id) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: vendedor_fornecedor_id, email, nome, fornecedor_global_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se vendedor já tem user_id
    const { data: vendedorExistente } = await supabaseAdmin
      .from('vendedores_fornecedor')
      .select('user_id')
      .eq('id', vendedor_fornecedor_id)
      .single();

    if (vendedorExistente?.user_id) {
      return new Response(
        JSON.stringify({ error: 'Este vendedor já possui acesso ao portal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se email já existe no auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está em uso por outro usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar usuário com senha padrão
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_SALESPERSON_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: nome,
      },
    });

    if (createError || !newUser.user) {
      console.error('Erro ao criar usuário:', createError);
      return new Response(
        JSON.stringify({ error: createError?.message || 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // Atualizar profile com vendedor_fornecedor_id, fornecedor_global_id e senha_alterada
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        vendedor_fornecedor_id: vendedor_fornecedor_id,
        fornecedor_global_id: fornecedor_global_id,
        senha_alterada: false,
        full_name: nome,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Erro ao atualizar profile:', profileError);
      // Tentar deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Erro ao configurar perfil do vendedor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir role 'vendedor_fornecedor'
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'vendedor_fornecedor' });

    if (roleError) {
      console.error('Erro ao inserir role:', roleError);
      // Continuar mesmo com erro na role, pois o usuário já foi criado
    }

    // Atualizar vendedores_fornecedor.user_id
    const { error: vendedorError } = await supabaseAdmin
      .from('vendedores_fornecedor')
      .update({ user_id: userId })
      .eq('id', vendedor_fornecedor_id);

    if (vendedorError) {
      console.error('Erro ao vincular vendedor:', vendedorError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário criado com sucesso',
        user_id: userId,
        email: email,
        senha_padrao: DEFAULT_SALESPERSON_PASSWORD,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
