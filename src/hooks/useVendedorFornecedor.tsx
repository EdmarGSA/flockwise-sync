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
  const [isOwner, setIsOwner] = useState(false);
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
        
        // Verificar se o user_id é o dono do fornecedor_global (tabela fornecedores_globais)
        const { data: fornecedorData } = await supabase
          .from('fornecedores_globais')
          .select('user_id')
          .eq('id', profile.fornecedor_global_id)
          .single();

        const userIsOwner = fornecedorData?.user_id === user.id;
        setIsOwner(userIsOwner);
        
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
        } else if (userIsOwner) {
          // Se é o dono e não tem vendedor, ainda é "vendedor" (com acesso total)
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
    isOwner,
    loading,
    fornecedorGlobalId,
    vendedorId: vendedor?.id || null,
    refetch: fetchVendedor
  };
};
