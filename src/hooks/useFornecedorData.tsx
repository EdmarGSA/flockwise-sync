import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClienteOrg {
  integrado_id: string;
  parceiro_id: string;
  razao_social: string;
}

export interface ClienteEstoque {
  integrado_id: string;
  integrado_nome: string;
  produto_id: string;
  produto_nome: string;
  codigo_fornecedor: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: string;
  preco_compra: number;
  ultimo_recebimento: string | null;
  consumo_medio_diario: number;
  dias_estoque: number;
}

export interface PedidoFornecedor {
  id: string;
  numero_pedido: string;
  integrado_id: string;
  integrado_nome: string;
  data_pedido: string;
  data_entrega_prevista: string | null;
  status: string;
  status_fornecedor: 'pendente_confirmacao' | 'confirmado' | 'enviado';
  valor_total: number;
  itens_count: number;
  fornecedor_confirmado_em: string | null;
  fornecedor_enviado_em: string | null;
  fornecedor_nf_numero: string | null;
}

export interface HistoricoPreco {
  id: string;
  produto_nome: string;
  integrado_nome: string;
  preco_anterior: number | null;
  preco_novo: number;
  data_alteracao: string;
}

export interface NotificacaoFornecedor {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalClientes: number;
  produtosVinculados: number;
  pedidosPendentes: number;
  valorPedidosPendentes: number;
  alertasEstoque: number;
  meusCatalogoProdutos: number;
  meusClientes: number;
}

export interface ClienteFornecedor {
  id: string;
  fornecedor_global_id: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  razao_social_nome: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  codigo_ibge: string | null;
  limite_credito: number;
  saldo_credito: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProdutoCatalogo {
  id: string;
  fornecedor_global_id: string;
  codigo_interno: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  marca: string | null;
  unidade_venda: string;
  preco_tabela: number;
  custo: number | null;
  codigo_barras: string | null;
  ncm: string | null;
  estoque_proprio: number;
  estoque_minimo: number;
  ativo: boolean;
  imagem_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useFornecedorData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fornecedorGlobalId, setFornecedorGlobalId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteOrg[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    produtosVinculados: 0,
    pedidosPendentes: 0,
    valorPedidosPendentes: 0,
    alertasEstoque: 0,
    meusCatalogoProdutos: 0,
    meusClientes: 0,
  });
  const [clientesEstoque, setClientesEstoque] = useState<ClienteEstoque[]>([]);
  const [pedidos, setPedidos] = useState<PedidoFornecedor[]>([]);
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoFornecedor[]>([]);
  const [meusClientes, setMeusClientes] = useState<ClienteFornecedor[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<ProdutoCatalogo[]>([]);

  // Fetch fornecedor_global_id from profile
  const fetchFornecedorGlobalId = useCallback(async () => {
    if (!user?.id) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('fornecedor_global_id')
      .eq('id', user.id)
      .single();
    
    return data?.fornecedor_global_id || null;
  }, [user?.id]);

  // Fetch all client organizations linked to this supplier
  const fetchClientes = useCallback(async (globalId: string) => {
    const { data: parceiros } = await supabase
      .from('parceiros')
      .select('id, integrado_id, razao_social_nome')
      .eq('fornecedor_global_id', globalId)
      .eq('ativo', true);

    if (!parceiros) return [];

    return parceiros.map(p => ({
      parceiro_id: p.id,
      integrado_id: p.integrado_id,
      razao_social: p.razao_social_nome,
    }));
  }, []);

  // Get parceiro IDs based on global supplier and optional filter
  const getParceiroIds = useCallback(async (globalId: string, integradoFilter?: string | null) => {
    let query = supabase
      .from('parceiros')
      .select('id, integrado_id, razao_social_nome')
      .eq('fornecedor_global_id', globalId)
      .eq('ativo', true);
    
    if (integradoFilter) {
      query = query.eq('integrado_id', integradoFilter);
    }

    const { data } = await query;
    return data || [];
  }, []);

  const fetchClientesEstoque = useCallback(async (globalId: string, integradoFilter?: string | null) => {
    const parceiros = await getParceiroIds(globalId, integradoFilter);
    if (!parceiros.length) return [];

    const parceiroIds = parceiros.map(p => p.id);
    const parceiroMap = new Map(parceiros.map(p => [p.id, p.razao_social_nome]));

    const { data: produtosFornecedor } = await supabase
      .from('produto_fornecedor')
      .select(`
        id,
        produto_id,
        parceiro_id,
        codigo_produto_fornecedor,
        preco_compra,
        produtos:produto_id (
          nome,
          estoque_atual,
          estoque_minimo,
          unidade_medida
        ),
        parceiros:parceiro_id (
          integrado_id
        )
      `)
      .in('parceiro_id', parceiroIds);

    if (!produtosFornecedor) return [];

    const estoqueData: ClienteEstoque[] = produtosFornecedor.map(pf => {
      const produto = pf.produtos as any;
      const parceiro = pf.parceiros as any;
      const estoqueAtual = produto?.estoque_atual || 0;
      const estoqueMinimo = produto?.estoque_minimo || 0;
      const consumoMedio = 10; // TODO: calcular real
      const diasEstoque = consumoMedio > 0 ? Math.floor(estoqueAtual / consumoMedio) : 999;

      return {
        integrado_id: parceiro?.integrado_id || '',
        integrado_nome: parceiroMap.get(pf.parceiro_id) || 'Cliente',
        produto_id: pf.produto_id,
        produto_nome: produto?.nome || 'Produto',
        codigo_fornecedor: pf.codigo_produto_fornecedor || '',
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        unidade: produto?.unidade_medida || 'un',
        preco_compra: pf.preco_compra || 0,
        ultimo_recebimento: null,
        consumo_medio_diario: consumoMedio,
        dias_estoque: diasEstoque,
      };
    });

    return estoqueData;
  }, [getParceiroIds]);

  const fetchPedidos = useCallback(async (globalId: string, integradoFilter?: string | null) => {
    const parceiros = await getParceiroIds(globalId, integradoFilter);
    if (!parceiros.length) return [];

    const parceiroIds = parceiros.map(p => p.id);
    const parceiroMap = new Map(parceiros.map(p => [p.id, p.razao_social_nome]));

    const { data } = await supabase
      .from('ordens_compra')
      .select(`
        id,
        numero_oc,
        integrado_id,
        parceiro_id,
        data_emissao,
        data_prevista_entrega,
        status,
        valor_total,
        fornecedor_confirmado_em,
        fornecedor_enviado_em,
        fornecedor_nf_numero
      `)
      .in('parceiro_id', parceiroIds)
      .in('status', ['aprovada', 'parcial_recebida', 'recebida'])
      .order('data_emissao', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return [];

    // Buscar contagem de itens
    const { data: itens } = await supabase
      .from('ordens_compra_itens')
      .select('ordem_compra_id')
      .in('ordem_compra_id', data.map(p => p.id));

    const itensCount = new Map<string, number>();
    itens?.forEach(item => {
      itensCount.set(item.ordem_compra_id, (itensCount.get(item.ordem_compra_id) || 0) + 1);
    });

    const getStatusFornecedor = (oc: any): 'pendente_confirmacao' | 'confirmado' | 'enviado' => {
      if (oc.fornecedor_enviado_em) return 'enviado';
      if (oc.fornecedor_confirmado_em) return 'confirmado';
      return 'pendente_confirmacao';
    };

    return data.map(p => ({
      id: p.id,
      numero_pedido: String(p.numero_oc),
      integrado_id: p.integrado_id,
      integrado_nome: parceiroMap.get(p.parceiro_id) || 'Cliente',
      data_pedido: p.data_emissao,
      data_entrega_prevista: p.data_prevista_entrega,
      status: p.status,
      status_fornecedor: getStatusFornecedor(p),
      valor_total: p.valor_total || 0,
      itens_count: itensCount.get(p.id) || 0,
      fornecedor_confirmado_em: p.fornecedor_confirmado_em,
      fornecedor_enviado_em: p.fornecedor_enviado_em,
      fornecedor_nf_numero: p.fornecedor_nf_numero,
    }));
  }, [getParceiroIds]);

  const fetchHistoricoPrecos = useCallback(async (globalId: string, integradoFilter?: string | null) => {
    const parceiros = await getParceiroIds(globalId, integradoFilter);
    if (!parceiros.length) return [];

    const parceiroIds = parceiros.map(p => p.id);

    const { data: produtosFornecedor } = await supabase
      .from('produto_fornecedor')
      .select('id, produto_id, parceiro_id')
      .in('parceiro_id', parceiroIds);

    if (!produtosFornecedor || produtosFornecedor.length === 0) return [];

    const pfIds = produtosFornecedor.map(pf => pf.id);
    
    const { data } = await supabase
      .from('historico_precos_fornecedor')
      .select('*')
      .in('produto_fornecedor_id', pfIds)
      .order('data_alteracao', { ascending: false })
      .limit(50);

    if (!data) return [];

    const produtoIds = [...new Set(produtosFornecedor.map(pf => pf.produto_id))];

    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome')
      .in('id', produtoIds);

    const produtosMap = new Map(produtos?.map(p => [p.id, p.nome]) || []);
    const parceiroMap = new Map(parceiros.map(p => [p.id, p.razao_social_nome]));
    const pfMap = new Map(produtosFornecedor.map(pf => [pf.id, pf]));

    return data.map(h => {
      const pf = pfMap.get(h.produto_fornecedor_id);
      return {
        id: h.id,
        produto_nome: pf ? produtosMap.get(pf.produto_id) || 'Produto' : 'Produto',
        integrado_nome: pf ? parceiroMap.get(pf.parceiro_id) || 'Cliente' : 'Cliente',
        preco_anterior: h.preco_anterior,
        preco_novo: h.preco_novo,
        data_alteracao: h.data_alteracao,
      };
    });
  }, [getParceiroIds]);

  const fetchNotificacoes = useCallback(async (globalId: string) => {
    // Generate notifications from pending orders
    const parceiros = await getParceiroIds(globalId);
    if (!parceiros.length) return [];

    const parceiroIds = parceiros.map(p => p.id);
    const parceiroMap = new Map(parceiros.map(p => [p.id, p.razao_social_nome]));

    const { data: pendingOrders } = await supabase
      .from('ordens_compra')
      .select('id, numero_oc, parceiro_id, data_emissao')
      .in('parceiro_id', parceiroIds)
      .is('fornecedor_confirmado_em', null)
      .in('status', ['aprovada'])
      .order('data_emissao', { ascending: false })
      .limit(10);

    return (pendingOrders || []).map(oc => ({
      id: `notif-${oc.id}`,
      tipo: 'pedido_novo',
      titulo: 'Novo Pedido',
      mensagem: `OC #${oc.numero_oc} de ${parceiroMap.get(oc.parceiro_id) || 'Cliente'} aguardando confirmação`,
      lida: false,
      created_at: oc.data_emissao,
    }));
  }, [getParceiroIds]);

  const marcarNotificacaoLida = useCallback(async (notificacaoId: string) => {
    setNotificacoes(prev => 
      prev.map(n => n.id === notificacaoId ? { ...n, lida: true } : n)
    );
  }, []);

  const confirmarPedido = useCallback(async (pedidoId: string) => {
    const { error } = await supabase
      .from('ordens_compra')
      .update({ fornecedor_confirmado_em: new Date().toISOString() })
      .eq('id', pedidoId);

    if (!error) {
      setPedidos(prev =>
        prev.map(p => p.id === pedidoId ? { 
          ...p, 
          status_fornecedor: 'confirmado' as const,
          fornecedor_confirmado_em: new Date().toISOString()
        } : p)
      );
    }

    return { error };
  }, []);

  const informarEnvio = useCallback(async (pedidoId: string, nfNumero: string, observacoes?: string) => {
    const { error } = await supabase
      .from('ordens_compra')
      .update({ 
        fornecedor_enviado_em: new Date().toISOString(),
        fornecedor_nf_numero: nfNumero,
        fornecedor_observacoes: observacoes || null
      })
      .eq('id', pedidoId);

    if (!error) {
      setPedidos(prev =>
        prev.map(p => p.id === pedidoId ? { 
          ...p, 
          status_fornecedor: 'enviado' as const,
          fornecedor_enviado_em: new Date().toISOString(),
          fornecedor_nf_numero: nfNumero
        } : p)
      );
    }

    return { error };
  }, []);

  // Fetch supplier's own clients (virtual)
  const fetchMeusClientes = useCallback(async (globalId: string) => {
    const { data, error } = await supabase
      .from('clientes_fornecedor')
      .select('*')
      .eq('fornecedor_global_id', globalId)
      .order('razao_social_nome');

    if (error) {
      console.error('Error fetching clientes_fornecedor:', error);
      return [];
    }

    return (data || []) as ClienteFornecedor[];
  }, []);

  // Fetch supplier's own product catalog
  const fetchProdutosCatalogo = useCallback(async (globalId: string) => {
    const { data, error } = await supabase
      .from('produtos_catalogo_fornecedor')
      .select('*')
      .eq('fornecedor_global_id', globalId)
      .order('nome');

    if (error) {
      console.error('Error fetching produtos_catalogo_fornecedor:', error);
      return [];
    }

    return (data || []) as ProdutoCatalogo[];
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    
    const globalId = await fetchFornecedorGlobalId();
    setFornecedorGlobalId(globalId);
    
    if (!globalId) {
      setLoading(false);
      return;
    }

    // Fetch clients list
    const clientesData = await fetchClientes(globalId);
    setClientes(clientesData);

    const filter = clienteSelecionado;

    const [estoque, pedidosData, historico, notifs, meusCli, meusProd] = await Promise.all([
      fetchClientesEstoque(globalId, filter),
      fetchPedidos(globalId, filter),
      fetchHistoricoPrecos(globalId, filter),
      fetchNotificacoes(globalId),
      fetchMeusClientes(globalId),
      fetchProdutosCatalogo(globalId),
    ]);

    setClientesEstoque(estoque);
    setPedidos(pedidosData);
    setHistoricoPrecos(historico);
    setNotificacoes(notifs);
    setMeusClientes(meusCli);
    setProdutosCatalogo(meusProd);

    // Calcular stats
    const clientesUnicos = new Set(estoque.map(e => e.integrado_id));
    const pedidosPendentes = pedidosData.filter(p => 
      p.status_fornecedor === 'pendente_confirmacao' || p.status_fornecedor === 'confirmado'
    );
    const alertasEstoque = estoque.filter(e => e.estoque_atual <= e.estoque_minimo).length;

    setStats({
      totalClientes: clientesUnicos.size || clientesData.length,
      produtosVinculados: estoque.length,
      pedidosPendentes: pedidosPendentes.length,
      valorPedidosPendentes: pedidosPendentes.reduce((sum, p) => sum + p.valor_total, 0),
      alertasEstoque,
      meusCatalogoProdutos: meusProd.filter(p => p.ativo).length,
      meusClientes: meusCli.filter(c => c.ativo).length,
    });

    setLoading(false);
  }, [fetchFornecedorGlobalId, fetchClientes, fetchClientesEstoque, fetchPedidos, fetchHistoricoPrecos, fetchNotificacoes, fetchMeusClientes, fetchProdutosCatalogo, clienteSelecionado]);

  // Refetch when client filter changes
  useEffect(() => {
    if (fornecedorGlobalId) {
      fetchAllData();
    }
  }, [clienteSelecionado]);

  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    loading,
    fornecedorGlobalId,
    clientes,
    clienteSelecionado,
    setClienteSelecionado,
    stats,
    clientesEstoque,
    pedidos,
    historicoPrecos,
    notificacoes,
    meusClientes,
    produtosCatalogo,
    marcarNotificacaoLida,
    confirmarPedido,
    informarEnvio,
    refetch: fetchAllData,
  };
};