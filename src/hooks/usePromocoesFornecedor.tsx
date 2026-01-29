import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromocaoFornecedor {
  id: string;
  fornecedor_id: string;
  produto_id: string;
  titulo: string;
  descricao: string | null;
  percentual_desconto: number | null;
  preco_promocional: number | null;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

export const usePromocoesFornecedor = (fornecedorGlobalId: string | null) => {
  const [promocoes, setPromocoes] = useState<PromocaoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromocoes = useCallback(async () => {
    if (!fornecedorGlobalId) {
      setPromocoes([]);
      setLoading(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('promocoes_fornecedor')
        .select('*')
        .eq('fornecedor_id', fornecedorGlobalId)
        .eq('ativo', true)
        .lte('data_inicio', now)
        .gte('data_fim', now);

      if (error) throw error;

      setPromocoes((data || []) as PromocaoFornecedor[]);
    } catch (error) {
      console.error('Erro ao buscar promoções:', error);
      setPromocoes([]);
    } finally {
      setLoading(false);
    }
  }, [fornecedorGlobalId]);

  useEffect(() => {
    fetchPromocoes();
  }, [fetchPromocoes]);

  const getPrecoFinal = useCallback((produtoId: string, precoTabela: number): { preco: number; emPromocao: boolean; percentual?: number } => {
    const promo = promocoes.find(p => p.produto_id === produtoId);
    
    if (!promo) {
      return { preco: precoTabela, emPromocao: false };
    }

    if (promo.preco_promocional) {
      return { 
        preco: promo.preco_promocional, 
        emPromocao: true,
        percentual: Math.round((1 - promo.preco_promocional / precoTabela) * 100)
      };
    }

    if (promo.percentual_desconto) {
      const precoFinal = precoTabela * (1 - promo.percentual_desconto / 100);
      return { 
        preco: precoFinal, 
        emPromocao: true,
        percentual: promo.percentual_desconto
      };
    }

    return { preco: precoTabela, emPromocao: false };
  }, [promocoes]);

  const getPromocaoProduto = useCallback((produtoId: string): PromocaoFornecedor | null => {
    return promocoes.find(p => p.produto_id === produtoId) || null;
  }, [promocoes]);

  return {
    promocoes,
    loading,
    getPrecoFinal,
    getPromocaoProduto,
    refetch: fetchPromocoes
  };
};
