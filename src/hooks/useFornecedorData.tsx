import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
}

export const useFornecedorData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parceiroId, setParceiroId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalClientes: 0,
    produtosVinculados: 0,
    pedidosPendentes: 0,
    valorPedidosPendentes: 0,
    alertasEstoque: 0,
  });
  const [clientesEstoque, setClientesEstoque] = useState<ClienteEstoque[]>([]);
  const [pedidos, setPedidos] = useState<PedidoFornecedor[]>([]);
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoFornecedor[]>([]);

  const fetchParceiroId = useCallback(async () => {
    if (!user?.id) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('parceiro_id')
      .eq('id', user.id)
      .single();
    
    return data?.parceiro_id || null;
  }, [user?.id]);

  const fetchClientesEstoque = useCallback(async (pId: string) => {
    // Buscar produtos vinculados a este fornecedor
    const { data: produtosFornecedor } = await supabase
      .from('produto_fornecedor')
      .select(`
        id,
        produto_id,
        integrado_id,
        codigo_produto_fornecedor,
        preco_compra,
        produtos:produto_id (
          nome,
          estoque_atual,
          estoque_minimo,
          unidade
        )
      `)
      .eq('parceiro_id', pId);

    if (!produtosFornecedor) return [];

    // Buscar nomes dos integrados
    const integradoIds = [...new Set(produtosFornecedor.map(p => p.integrado_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', integradoIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Calcular consumo médio (últimos 30 dias de movimentações)
    const estoqueData: ClienteEstoque[] = produtosFornecedor.map(pf => {
      const produto = pf.produtos as any;
      const estoqueAtual = produto?.estoque_atual || 0;
      const estoqueMinimo = produto?.estoque_minimo || 0;
      const consumoMedio = 10; // TODO: calcular real baseado no kardex
      const diasEstoque = consumoMedio > 0 ? Math.floor(estoqueAtual / consumoMedio) : 999;

      return {
        integrado_id: pf.integrado_id,
        integrado_nome: profilesMap.get(pf.integrado_id) || 'Cliente',
        produto_id: pf.produto_id,
        produto_nome: produto?.nome || 'Produto',
        codigo_fornecedor: pf.codigo_produto_fornecedor || '',
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        unidade: produto?.unidade || 'un',
        preco_compra: pf.preco_compra || 0,
        ultimo_recebimento: null,
        consumo_medio_diario: consumoMedio,
        dias_estoque: diasEstoque,
      };
    });

    return estoqueData;
  }, []);

  const fetchPedidos = useCallback(async (pId: string) => {
    // Buscar ordens de compra aprovadas pelo cliente que foram destinadas a este fornecedor
    const { data } = await supabase
      .from('ordens_compra')
      .select(`
        id,
        numero_oc,
        integrado_id,
        data_emissao,
        data_prevista_entrega,
        status,
        valor_total,
        fornecedor_confirmado_em,
        fornecedor_enviado_em,
        fornecedor_nf_numero
      `)
      .eq('parceiro_id', pId)
      .in('status', ['aprovada', 'parcial_recebida', 'recebida'])
      .order('data_emissao', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return [];

    // Buscar nomes dos integrados (clientes)
    const integradoIds = [...new Set(data.map(p => p.integrado_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', integradoIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Buscar contagem de itens
    const { data: itens } = await supabase
      .from('ordens_compra_itens')
      .select('ordem_compra_id')
      .in('ordem_compra_id', data.map(p => p.id));

    const itensCount = new Map<string, number>();
    itens?.forEach(item => {
      itensCount.set(item.ordem_compra_id, (itensCount.get(item.ordem_compra_id) || 0) + 1);
    });

    // Determinar status do fornecedor baseado nos campos
    const getStatusFornecedor = (oc: any): 'pendente_confirmacao' | 'confirmado' | 'enviado' => {
      if (oc.fornecedor_enviado_em) return 'enviado';
      if (oc.fornecedor_confirmado_em) return 'confirmado';
      return 'pendente_confirmacao';
    };

    return data.map(p => ({
      id: p.id,
      numero_pedido: String(p.numero_oc),
      integrado_id: p.integrado_id,
      integrado_nome: profilesMap.get(p.integrado_id) || 'Cliente',
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
  }, []);

  const fetchHistoricoPrecos = useCallback(async (pId: string) => {
    const { data: produtosFornecedor } = await supabase
      .from('produto_fornecedor')
      .select('id, produto_id, integrado_id')
      .eq('parceiro_id', pId);

    if (!produtosFornecedor || produtosFornecedor.length === 0) return [];

    const pfIds = produtosFornecedor.map(pf => pf.id);
    
    const { data } = await supabase
      .from('historico_precos_fornecedor')
      .select('*')
      .in('produto_fornecedor_id', pfIds)
      .order('data_alteracao', { ascending: false })
      .limit(50);

    if (!data) return [];

    // Map para nomes
    const produtoIds = [...new Set(produtosFornecedor.map(pf => pf.produto_id))];
    const integradoIds = [...new Set(produtosFornecedor.map(pf => pf.integrado_id))];

    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome')
      .in('id', produtoIds);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', integradoIds);

    const produtosMap = new Map(produtos?.map(p => [p.id, p.nome]) || []);
    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
    const pfMap = new Map(produtosFornecedor.map(pf => [pf.id, pf]));

    return data.map(h => {
      const pf = pfMap.get(h.produto_fornecedor_id);
      return {
        id: h.id,
        produto_nome: pf ? produtosMap.get(pf.produto_id) || 'Produto' : 'Produto',
        integrado_nome: pf ? profilesMap.get(pf.integrado_id) || 'Cliente' : 'Cliente',
        preco_anterior: h.preco_anterior,
        preco_novo: h.preco_novo,
        data_alteracao: h.data_alteracao,
      };
    });
  }, []);

  const fetchNotificacoes = useCallback(async (pId: string) => {
    const { data } = await supabase
      .from('notificacoes_fornecedor')
      .select('*')
      .eq('fornecedor_id', pId)
      .order('created_at', { ascending: false })
      .limit(20);

    return data || [];
  }, []);

  const marcarNotificacaoLida = useCallback(async (notificacaoId: string) => {
    await supabase
      .from('notificacoes_fornecedor')
      .update({ lida: true, data_leitura: new Date().toISOString() })
      .eq('id', notificacaoId);
    
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

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    
    const pId = await fetchParceiroId();
    setParceiroId(pId);
    
    if (!pId) {
      setLoading(false);
      return;
    }

    const [estoque, pedidosData, historico, notifs] = await Promise.all([
      fetchClientesEstoque(pId),
      fetchPedidos(pId),
      fetchHistoricoPrecos(pId),
      fetchNotificacoes(pId),
    ]);

    setClientesEstoque(estoque);
    setPedidos(pedidosData);
    setHistoricoPrecos(historico);
    setNotificacoes(notifs);

    // Calcular stats
    const clientesUnicos = new Set(estoque.map(e => e.integrado_id));
    // Pedidos pendentes = não confirmados ou não enviados ainda
    const pedidosPendentes = pedidosData.filter(p => 
      p.status_fornecedor === 'pendente_confirmacao' || p.status_fornecedor === 'confirmado'
    );
    const alertasEstoque = estoque.filter(e => e.estoque_atual <= e.estoque_minimo).length;

    setStats({
      totalClientes: clientesUnicos.size,
      produtosVinculados: estoque.length,
      pedidosPendentes: pedidosPendentes.length,
      valorPedidosPendentes: pedidosPendentes.reduce((sum, p) => sum + p.valor_total, 0),
      alertasEstoque,
    });

    setLoading(false);
  }, [fetchParceiroId, fetchClientesEstoque, fetchPedidos, fetchHistoricoPrecos, fetchNotificacoes]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    loading,
    parceiroId,
    stats,
    clientesEstoque,
    pedidos,
    historicoPrecos,
    notificacoes,
    marcarNotificacaoLida,
    confirmarPedido,
    informarEnvio,
    refetch: fetchAllData,
  };
};
