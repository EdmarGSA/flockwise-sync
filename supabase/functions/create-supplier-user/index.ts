import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate, hasAnyRole, unauthorized, forbidden } from "../_shared/authGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSupplierRequest {
  cpf_cnpj: string;
  razao_social_nome: string;
  nome_fantasia?: string;
  email: string;
  telefone?: string;
}

interface CreateSupplierResponse {
  success: boolean;
  fornecedor_global_id: string;
  is_new_user: boolean;
  message: string;
  credentials?: {
    email: string;
    password: string;
  };
}

// Senha padrão para fornecedores - usuário deve alterar no primeiro acesso
const DEFAULT_SUPPLIER_PASSWORD = 'For123#';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: CreateSupplierRequest = await req.json();
    console.log('Received request to create/link supplier:', body.cpf_cnpj);

    const { cpf_cnpj, razao_social_nome, nome_fantasia, email, telefone } = body;

    // Validate required fields
    if (!cpf_cnpj || !razao_social_nome || !email) {
      return new Response(
        JSON.stringify({ success: false, message: 'CPF/CNPJ, Razão Social e Email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean CPF/CNPJ
    const cleanCpfCnpj = cpf_cnpj.replace(/\D/g, '');

    // Check if global supplier already exists
    const { data: existingSupplier, error: searchError } = await supabaseAdmin
      .from('fornecedores_globais')
      .select('id, user_id, email')
      .eq('cpf_cnpj', cleanCpfCnpj)
      .maybeSingle();

    if (searchError) {
      console.error('Error searching for supplier:', searchError);
      throw searchError;
    }

    // Supplier already exists - just return the ID
    if (existingSupplier) {
      console.log('Supplier already exists:', existingSupplier.id);
      return new Response(
        JSON.stringify({
          success: true,
          fornecedor_global_id: existingSupplier.id,
          is_new_user: false,
          message: 'Fornecedor já cadastrado no sistema',
        } as CreateSupplierResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user with default password
    console.log('Creating new supplier user...');
    
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: DEFAULT_SUPPLIER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: razao_social_nome,
        is_supplier: true,
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      
      // Check if user already exists with this email
      if (createUserError.message?.includes('already')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Email já está em uso por outro usuário' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw createUserError;
    }

    console.log('User created:', newUser.user.id);

    // Create global supplier record
    const { data: newSupplier, error: supplierError } = await supabaseAdmin
      .from('fornecedores_globais')
      .insert({
        cpf_cnpj: cleanCpfCnpj,
        razao_social_nome,
        nome_fantasia: nome_fantasia || null,
        email,
        telefone: telefone || null,
        user_id: newUser.user.id,
        ativo: true,
      })
      .select('id')
      .single();

    if (supplierError) {
      console.error('Error creating supplier:', supplierError);
      // Try to cleanup the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw supplierError;
    }

    console.log('Supplier created:', newSupplier.id);

    // Update profile with fornecedor_global_id and mark password as not changed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        fornecedor_global_id: newSupplier.id,
        full_name: razao_social_nome,
        senha_alterada: false, // Precisa trocar a senha padrão
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-fatal, continue
    }

    // Add supplier role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'fornecedor',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Non-fatal, continue
    }

    console.log('Supplier setup complete');

    return new Response(
      JSON.stringify({
        success: true,
        fornecedor_global_id: newSupplier.id,
        is_new_user: true,
        message: 'Fornecedor criado com sucesso',
        credentials: {
          email,
          password: DEFAULT_SUPPLIER_PASSWORD,
        },
      } as CreateSupplierResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-supplier-user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});