import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VendedorFornecedor {
  id: string;
  fornecedor_global_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  codigo_vendedor: string | null;
  regiao: string | null;
  observacoes: string | null;
  ativo: boolean;
  user_id: string | null;
}

export const useVendedorFornecedor = () => {
  const { user } = useAuth();
  const [vendedor, setVendedor] = useState<VendedorFornecedor | null>(null);
  const [isVendedor, setIsVendedor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fornecedorGlobalId, setFornecedorGlobalId] = useState<string | null>(null);

  const fetchVendedor = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Primeiro, buscar fornecedor_global_id do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('fornecedor_global_id')
        .eq('id', user.id)
        .single();

      if (profile?.fornecedor_global_id) {
        setFornecedorGlobalId(profile.fornecedor_global_id);
        
        // Buscar vendedor vinculado ao user_id
        const { data: vendedorData } = await supabase
          .from('vendedores_fornecedor')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .single();

        if (vendedorData) {
          setVendedor(vendedorData as VendedorFornecedor);
          setIsVendedor(true);
        } else {
          // Se não tem vendedor específico, usuário é o próprio fornecedor
          setIsVendedor(true);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vendedor:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchVendedor();
  }, [fetchVendedor]);

  return {
    vendedor,
    isVendedor,
    loading,
    fornecedorGlobalId,
    refetch: fetchVendedor
  };
};
