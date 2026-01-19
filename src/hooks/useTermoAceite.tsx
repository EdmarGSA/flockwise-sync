import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TipoTermo = 'cliente_autorizacao' | 'fornecedor_adesao';

interface TermoVersao {
  id: string;
  tipo: string;
  versao: string;
  titulo: string;
  conteudo_html: string;
  checkbox_texto: string;
  ativo: boolean;
  data_vigencia: string;
}

interface UseTermoAceiteOptions {
  tipo: TipoTermo;
  parceiroId?: string | null;
}

interface UseTermoAceiteReturn {
  termoAtivo: TermoVersao | null;
  jaAceitou: boolean;
  loading: boolean;
  registrarAceite: (ipAddress?: string) => Promise<boolean>;
  verificarAceite: () => Promise<boolean>;
}

export const useTermoAceite = ({ tipo, parceiroId }: UseTermoAceiteOptions): UseTermoAceiteReturn => {
  const { user } = useAuth();
  const [termoAtivo, setTermoAtivo] = useState<TermoVersao | null>(null);
  const [jaAceitou, setJaAceitou] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch termo ativo
  const fetchTermoAtivo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('termos_versoes')
        .select('*')
        .eq('tipo', tipo)
        .eq('ativo', true)
        .order('data_vigencia', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar termo:', error);
        return null;
      }

      return data as TermoVersao | null;
    } catch (err) {
      console.error('Erro ao buscar termo:', err);
      return null;
    }
  }, [tipo]);

  // Verificar aceite
  const verificarAceite = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !termoAtivo) {
      return true; // Sem termo configurado = liberado
    }

    try {
      let query = supabase
        .from('termos_aceites')
        .select('id')
        .eq('user_id', user.id)
        .eq('termo_versao_id', termoAtivo.id);

      if (parceiroId) {
        query = query.eq('parceiro_id', parceiroId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        console.error('Erro ao verificar aceite:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (err) {
      console.error('Erro ao verificar aceite:', err);
      return false;
    }
  }, [user?.id, termoAtivo, parceiroId]);

  // Registrar aceite
  const registrarAceite = useCallback(async (ipAddress?: string): Promise<boolean> => {
    if (!user?.id || !termoAtivo) {
      return false;
    }

    try {
      // Gerar hash do conteúdo (SHA-256)
      const encoder = new TextEncoder();
      const data = encoder.encode(termoAtivo.conteudo_html);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const conteudoHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Buscar fornecedor_global_id se for fornecedor
      let fornecedorGlobalId: string | null = null;
      if (tipo === 'fornecedor_adesao') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('fornecedor_global_id')
          .eq('id', user.id)
          .single();
        fornecedorGlobalId = profile?.fornecedor_global_id || null;
      }

      const { error } = await supabase
        .from('termos_aceites')
        .insert({
          user_id: user.id,
          termo_versao_id: termoAtivo.id,
          tipo_termo: tipo,
          ip_address: ipAddress || null,
          user_agent: navigator.userAgent,
          parceiro_id: parceiroId || null,
          fornecedor_global_id: fornecedorGlobalId,
          conteudo_hash: conteudoHash,
        });

      if (error) {
        console.error('Erro ao registrar aceite:', error);
        return false;
      }

      setJaAceitou(true);
      return true;
    } catch (err) {
      console.error('Erro ao registrar aceite:', err);
      return false;
    }
  }, [user?.id, termoAtivo, tipo, parceiroId]);

  // Load inicial
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      const termo = await fetchTermoAtivo();
      setTermoAtivo(termo);
      
      if (termo && user?.id) {
        const aceito = await verificarAceite();
        setJaAceitou(aceito);
      } else if (!termo) {
        // Sem termo configurado = liberado
        setJaAceitou(true);
      }
      
      setLoading(false);
    };

    if (user?.id) {
      init();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchTermoAtivo]);

  // Re-verificar quando termoAtivo mudar
  useEffect(() => {
    if (termoAtivo && user?.id) {
      verificarAceite().then(setJaAceitou);
    }
  }, [termoAtivo, user?.id, verificarAceite]);

  return {
    termoAtivo,
    jaAceitou,
    loading,
    registrarAceite,
    verificarAceite,
  };
};
