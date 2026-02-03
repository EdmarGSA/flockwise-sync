import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Status transitions permitidas
const TRANSICOES_VALIDAS: Record<string, string[]> = {
  'pendente': ['exportado'],
  'exportado': ['aprovado', 'erro'],
  'aprovado': ['separado', 'erro'],
  'separado': ['faturado', 'erro'],
  'faturado': ['entregue'],
  'entregue': [],
  'erro': ['pendente', 'exportado'] // Permite reprocessar
};

// Função para gerar hash SHA-256
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Função para validar API Key
async function validateApiKey(supabase: any, apiKey: string) {
  const hashHex = await hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('sync_erp_api_keys')
    .select('id, fornecedor_global_id, nome')
    .eq('api_key_hash', hashHex)
    .eq('ativo', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Atualiza último uso
  await supabase
    .from('sync_erp_api_keys')
    .update({ ultimo_uso: new Date().toISOString() })
    .eq('id', data.id);

  return data;
}

// Função para registrar log
async function registrarLog(
  supabase: any, 
  fornecedorGlobalId: string, 
  tipoEntidade: string, 
  direcao: string,
  registrosEnviados: number,
  registrosProcessados: number,
  registrosErro: number,
  erros: any[] = [],
  detalhes: any = {}
) {
  await supabase.from('sync_erp_log').insert({
    fornecedor_global_id: fornecedorGlobalId,
    tipo_entidade: tipoEntidade,
    direcao: direcao,
    registros_enviados: registrosEnviados,
    registros_processados: registrosProcessados,
    registros_erro: registrosErro,
    erros: erros,
    detalhes: detalhes
  });
}

// Ação: sync_produtos
async function syncProdutos(supabase: any, fornecedorGlobalId: string, produtos: any[]) {
  let processados = 0;
  let erros: any[] = [];

  for (const produto of produtos) {
    try {
      if (!produto.codigo_erp) {
        erros.push({ codigo_erp: produto.codigo_erp, erro: 'codigo_erp é obrigatório' });
        continue;
      }

      // Verifica se produto existe pelo codigo_erp
      const { data: existente } = await supabase
        .from('produtos_catalogo_fornecedor')
        .select('id')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .eq('codigo_erp', produto.codigo_erp)
        .single();

      if (existente) {
        // Update
        await supabase
          .from('produtos_catalogo_fornecedor')
          .update({
            nome: produto.nome,
            preco_tabela: produto.preco,
            estoque_disponivel: produto.estoque,
            ativo: produto.ativo ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id);
      } else {
        // Insert
        await supabase
          .from('produtos_catalogo_fornecedor')
          .insert({
            fornecedor_global_id: fornecedorGlobalId,
            codigo_erp: produto.codigo_erp,
            nome: produto.nome,
            preco_tabela: produto.preco,
            estoque_disponivel: produto.estoque,
            ativo: produto.ativo ?? true,
            unidade_venda: produto.unidade || 'UN'
          });
      }
      processados++;
    } catch (e: any) {
      erros.push({ codigo_erp: produto.codigo_erp, erro: e.message });
    }
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'produtos', 'erp_para_cloud',
    produtos.length, processados, erros.length, erros, { acao: 'sync_produtos' }
  );

  return { processados, erros: erros.length, detalhes: erros };
}

// Ação: sync_clientes
async function syncClientes(supabase: any, fornecedorGlobalId: string, clientes: any[]) {
  let processados = 0;
  let erros: any[] = [];

  for (const cliente of clientes) {
    try {
      if (!cliente.codigo_erp || !cliente.cpf_cnpj) {
        erros.push({ codigo_erp: cliente.codigo_erp, erro: 'codigo_erp e cpf_cnpj são obrigatórios' });
        continue;
      }

      // Verifica se cliente existe pelo codigo_erp
      const { data: existente } = await supabase
        .from('clientes_fornecedor')
        .select('id')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .eq('codigo_erp', cliente.codigo_erp)
        .single();

      const clienteData = {
        razao_social_nome: cliente.razao_social || cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj.replace(/\D/g, ''),
        email: cliente.email,
        telefone: cliente.telefone,
        celular: cliente.celular,
        logradouro: cliente.endereco?.logradouro,
        numero: cliente.endereco?.numero,
        complemento: cliente.endereco?.complemento,
        bairro: cliente.endereco?.bairro,
        cidade: cliente.endereco?.cidade,
        estado: cliente.endereco?.estado,
        cep: cliente.endereco?.cep,
        limite_credito: cliente.limite_credito,
        saldo_credito: cliente.saldo_credito,
        ativo: cliente.ativo ?? true,
        updated_at: new Date().toISOString()
      };

      if (existente) {
        await supabase
          .from('clientes_fornecedor')
          .update(clienteData)
          .eq('id', existente.id);
      } else {
        await supabase
          .from('clientes_fornecedor')
          .insert({
            ...clienteData,
            fornecedor_global_id: fornecedorGlobalId,
            codigo_erp: cliente.codigo_erp,
            tipo_pessoa: cliente.cpf_cnpj.length > 11 ? 'juridica' : 'fisica'
          });
      }
      processados++;
    } catch (e: any) {
      erros.push({ codigo_erp: cliente.codigo_erp, erro: e.message });
    }
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'clientes', 'erp_para_cloud',
    clientes.length, processados, erros.length, erros, { acao: 'sync_clientes' }
  );

  return { processados, erros: erros.length, detalhes: erros };
}

// Ação: sync_credito
async function syncCredito(supabase: any, fornecedorGlobalId: string, creditos: any[]) {
  let processados = 0;
  let erros: any[] = [];

  for (const credito of creditos) {
    try {
      if (!credito.codigo_erp_cliente) {
        erros.push({ codigo_erp: credito.codigo_erp_cliente, erro: 'codigo_erp_cliente é obrigatório' });
        continue;
      }

      const { data: cliente } = await supabase
        .from('clientes_fornecedor')
        .select('id')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .eq('codigo_erp', credito.codigo_erp_cliente)
        .single();

      if (!cliente) {
        erros.push({ codigo_erp: credito.codigo_erp_cliente, erro: 'Cliente não encontrado' });
        continue;
      }

      await supabase
        .from('clientes_fornecedor')
        .update({
          limite_credito: credito.limite,
          saldo_credito: credito.saldo,
          updated_at: new Date().toISOString()
        })
        .eq('id', cliente.id);

      processados++;
    } catch (e: any) {
      erros.push({ codigo_erp: credito.codigo_erp_cliente, erro: e.message });
    }
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'credito', 'erp_para_cloud',
    creditos.length, processados, erros.length, erros, { acao: 'sync_credito' }
  );

  return { processados, erros: erros.length, detalhes: erros };
}

// Ação: buscar_pedidos
async function buscarPedidos(supabase: any, fornecedorGlobalId: string, status: string = 'pendente') {
  const { data, error } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .select(`
      id,
      numero_pedido,
      created_at,
      valor_total,
      condicao_pagamento,
      data_entrega_prevista,
      observacoes,
      status,
      cliente:clientes_fornecedor(
        id, razao_social_nome, cpf_cnpj, codigo_erp, email, telefone,
        logradouro, numero, complemento, bairro, cidade, estado, cep
      ),
      itens:pedidos_catalogo_fornecedor_itens(
        quantidade,
        preco_unitario,
        valor_total,
        produto:produtos_catalogo_fornecedor(
          id, nome, codigo_interno, codigo_erp, unidade_venda
        )
      )
    `)
    .eq('fornecedor_global_id', fornecedorGlobalId)
    .eq('status', status)
    .is('codigo_erp', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar pedidos: ${error.message}`);
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'pedidos', 'cloud_para_erp',
    0, data?.length || 0, 0, [], { acao: 'buscar_pedidos', status }
  );

  return { pedidos: data || [] };
}

// Ação: confirmar_pedido_erp
async function confirmarPedidoErp(supabase: any, fornecedorGlobalId: string, pedidoId: string, codigoErp: string) {
  // Validar que o pedido pertence ao fornecedor
  const { data: pedido, error: fetchError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .select('id, fornecedor_global_id, status')
    .eq('id', pedidoId)
    .single();

  if (fetchError || !pedido) {
    throw new Error('Pedido não encontrado');
  }

  if (pedido.fornecedor_global_id !== fornecedorGlobalId) {
    throw new Error('Acesso negado: pedido não pertence a este fornecedor');
  }

  const { error: updateError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .update({
      codigo_erp: codigoErp,
      status: 'exportado',
      erp_error_message: null,
      erp_error_at: null
    })
    .eq('id', pedidoId);

  if (updateError) {
    throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'pedidos', 'erp_para_cloud',
    1, 1, 0, [], { acao: 'confirmar_pedido_erp', pedido_id: pedidoId, codigo_erp: codigoErp }
  );

  return { success: true, pedido_id: pedidoId, novo_status: 'exportado' };
}

// Ação: atualizar_status
async function atualizarStatus(supabase: any, fornecedorGlobalId: string, pedidoId: string, novoStatus: string) {
  // Validar que o pedido pertence ao fornecedor
  const { data: pedido, error: fetchError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .select('id, fornecedor_global_id, status')
    .eq('id', pedidoId)
    .single();

  if (fetchError || !pedido) {
    throw new Error('Pedido não encontrado');
  }

  if (pedido.fornecedor_global_id !== fornecedorGlobalId) {
    throw new Error('Acesso negado: pedido não pertence a este fornecedor');
  }

  // Validar transição de status
  const transicoesPermitidas = TRANSICOES_VALIDAS[pedido.status] || [];
  if (!transicoesPermitidas.includes(novoStatus)) {
    throw new Error(`Transição inválida: ${pedido.status} -> ${novoStatus}. Transições permitidas: ${transicoesPermitidas.join(', ')}`);
  }

  const { error: updateError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .update({
      status: novoStatus,
      erp_error_message: null,
      erp_error_at: null
    })
    .eq('id', pedidoId);

  if (updateError) {
    throw new Error(`Erro ao atualizar status: ${updateError.message}`);
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'pedidos', 'erp_para_cloud',
    1, 1, 0, [], { acao: 'atualizar_status', pedido_id: pedidoId, status_anterior: pedido.status, novo_status: novoStatus }
  );

  return { success: true, pedido_id: pedidoId, status_anterior: pedido.status, novo_status: novoStatus };
}

// Ação: confirmar_nfe
async function confirmarNfe(supabase: any, fornecedorGlobalId: string, pedidoId: string, numeroNfe: string, chaveNfe: string, dataFaturamento: string) {
  // Validar que o pedido pertence ao fornecedor
  const { data: pedido, error: fetchError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .select('id, fornecedor_global_id, status')
    .eq('id', pedidoId)
    .single();

  if (fetchError || !pedido) {
    throw new Error('Pedido não encontrado');
  }

  if (pedido.fornecedor_global_id !== fornecedorGlobalId) {
    throw new Error('Acesso negado: pedido não pertence a este fornecedor');
  }

  const { error: updateError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .update({
      status: 'faturado',
      numero_nfe: numeroNfe,
      chave_nfe: chaveNfe,
      data_faturamento: dataFaturamento,
      erp_error_message: null,
      erp_error_at: null
    })
    .eq('id', pedidoId);

  if (updateError) {
    throw new Error(`Erro ao confirmar NF-e: ${updateError.message}`);
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'pedidos', 'erp_para_cloud',
    1, 1, 0, [], { acao: 'confirmar_nfe', pedido_id: pedidoId, numero_nfe: numeroNfe }
  );

  return { success: true, pedido_id: pedidoId, novo_status: 'faturado', numero_nfe: numeroNfe };
}

// Ação: sync_vendedores
async function syncVendedores(supabase: any, fornecedorGlobalId: string, vendedores: any[]) {
  let processados = 0;
  let erros: any[] = [];

  for (const vendedor of vendedores) {
    try {
      // Validação de campos obrigatórios
      if (!vendedor.codigo_erp || !vendedor.nome) {
        erros.push({ codigo_erp: vendedor.codigo_erp, erro: 'codigo_erp e nome são obrigatórios' });
        continue;
      }

      // Verificar se vendedor existe pelo codigo_vendedor
      const { data: existente } = await supabase
        .from('vendedores_fornecedor')
        .select('id, user_id')
        .eq('fornecedor_global_id', fornecedorGlobalId)
        .eq('codigo_vendedor', vendedor.codigo_erp)
        .single();

      const vendedorData = {
        nome: vendedor.nome,
        email: vendedor.email,
        telefone: vendedor.telefone,
        regiao: vendedor.regiao,
        observacoes: vendedor.observacoes,
        ativo: vendedor.ativo ?? true,
        updated_at: new Date().toISOString()
      };

      if (existente) {
        // UPDATE - mantém user_id intacto para não quebrar login vinculado
        await supabase
          .from('vendedores_fornecedor')
          .update(vendedorData)
          .eq('id', existente.id);
      } else {
        // INSERT
        await supabase
          .from('vendedores_fornecedor')
          .insert({
            ...vendedorData,
            fornecedor_global_id: fornecedorGlobalId,
            codigo_vendedor: vendedor.codigo_erp
          });
      }
      processados++;
    } catch (e: any) {
      erros.push({ codigo_erp: vendedor.codigo_erp, erro: e.message });
    }
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'vendedores', 'erp_para_cloud',
    vendedores.length, processados, erros.length, erros, { acao: 'sync_vendedores' }
  );

  return { processados, erros: erros.length, detalhes: erros };
}

// Ação: registrar_erro_pedido
async function registrarErroPedido(supabase: any, fornecedorGlobalId: string, pedidoId: string, errorMessage: string) {
  // Validar que o pedido pertence ao fornecedor
  const { data: pedido, error: fetchError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .select('id, fornecedor_global_id, status')
    .eq('id', pedidoId)
    .single();

  if (fetchError || !pedido) {
    throw new Error('Pedido não encontrado');
  }

  if (pedido.fornecedor_global_id !== fornecedorGlobalId) {
    throw new Error('Acesso negado: pedido não pertence a este fornecedor');
  }

  const { error: updateError } = await supabase
    .from('pedidos_catalogo_fornecedor')
    .update({
      status: 'erro',
      erp_error_message: errorMessage,
      erp_error_at: new Date().toISOString()
    })
    .eq('id', pedidoId);

  if (updateError) {
    throw new Error(`Erro ao registrar erro: ${updateError.message}`);
  }

  await registrarLog(
    supabase, fornecedorGlobalId, 'pedidos', 'erp_para_cloud',
    1, 1, 0, [], { acao: 'registrar_erro_pedido', pedido_id: pedidoId, error_message: errorMessage }
  );

  return { success: true, pedido_id: pedidoId, novo_status: 'erro' };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key não fornecida. Use o header X-API-Key.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKeyData = await validateApiKey(supabase, apiKey);
    if (!apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'API Key inválida ou inativa.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fornecedorGlobalId = apiKeyData.fornecedor_global_id;

    // Parse body
    const body = await req.json();
    const { acao, ...dados } = body;

    if (!acao) {
      return new Response(
        JSON.stringify({ error: 'Campo "acao" é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let resultado: any;

    // Router de ações
    switch (acao) {
      case 'sync_produtos':
        if (!dados.produtos || !Array.isArray(dados.produtos)) {
          throw new Error('Campo "produtos" deve ser um array');
        }
        resultado = await syncProdutos(supabase, fornecedorGlobalId, dados.produtos);
        break;

      case 'sync_clientes':
        if (!dados.clientes || !Array.isArray(dados.clientes)) {
          throw new Error('Campo "clientes" deve ser um array');
        }
        resultado = await syncClientes(supabase, fornecedorGlobalId, dados.clientes);
        break;

      case 'sync_credito':
        if (!dados.creditos || !Array.isArray(dados.creditos)) {
          throw new Error('Campo "creditos" deve ser um array');
        }
        resultado = await syncCredito(supabase, fornecedorGlobalId, dados.creditos);
        break;

      case 'buscar_pedidos':
        resultado = await buscarPedidos(supabase, fornecedorGlobalId, dados.status || 'pendente');
        break;

      case 'confirmar_pedido_erp':
        if (!dados.pedido_id || !dados.codigo_erp) {
          throw new Error('Campos "pedido_id" e "codigo_erp" são obrigatórios');
        }
        resultado = await confirmarPedidoErp(supabase, fornecedorGlobalId, dados.pedido_id, dados.codigo_erp);
        break;

      case 'atualizar_status':
        if (!dados.pedido_id || !dados.novo_status) {
          throw new Error('Campos "pedido_id" e "novo_status" são obrigatórios');
        }
        resultado = await atualizarStatus(supabase, fornecedorGlobalId, dados.pedido_id, dados.novo_status);
        break;

      case 'confirmar_nfe':
        if (!dados.pedido_id || !dados.numero_nfe || !dados.chave_nfe) {
          throw new Error('Campos "pedido_id", "numero_nfe" e "chave_nfe" são obrigatórios');
        }
        resultado = await confirmarNfe(
          supabase, fornecedorGlobalId, 
          dados.pedido_id, dados.numero_nfe, dados.chave_nfe, 
          dados.data_faturamento || new Date().toISOString().split('T')[0]
        );
        break;

      case 'sync_vendedores':
        if (!dados.vendedores || !Array.isArray(dados.vendedores)) {
          throw new Error('Campo "vendedores" deve ser um array');
        }
        resultado = await syncVendedores(supabase, fornecedorGlobalId, dados.vendedores);
        break;

      case 'registrar_erro_pedido':
        if (!dados.pedido_id || !dados.error_message) {
          throw new Error('Campos "pedido_id" e "error_message" são obrigatórios');
        }
        resultado = await registrarErroPedido(supabase, fornecedorGlobalId, dados.pedido_id, dados.error_message);
        break;

      default:
        throw new Error(`Ação desconhecida: ${acao}. Ações válidas: sync_produtos, sync_clientes, sync_credito, sync_vendedores, buscar_pedidos, confirmar_pedido_erp, atualizar_status, confirmar_nfe, registrar_erro_pedido`);
    }

    return new Response(
      JSON.stringify({ success: true, acao, ...resultado }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na sync-erp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
