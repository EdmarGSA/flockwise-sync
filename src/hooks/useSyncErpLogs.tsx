import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncErpLog {
  id: string;
  fornecedor_global_id: string;
  tipo_entidade: string;
  direcao: string;
  registros_enviados: number;
  registros_processados: number;
  registros_erro: number;
  erros: any[];
  detalhes: any;
  created_at: string;
}

interface SyncErpApiKey {
  id: string;
  fornecedor_global_id: string;
  nome: string;
  api_key_hash: string;
  ativo: boolean;
  ultimo_uso: string | null;
  created_at: string;
}

export const useSyncErpLogs = (fornecedorGlobalId: string | null) => {
  const [logs, setLogs] = useState<SyncErpLog[]>([]);
  const [apiKeys, setApiKeys] = useState<SyncErpApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!fornecedorGlobalId) return;
    
    const { data, error } = await supabase
      .from('sync_erp_log')
      .select('*')
      .eq('fornecedor_global_id', fornecedorGlobalId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as SyncErpLog[]);
    }
  };

  const fetchApiKeys = async () => {
    if (!fornecedorGlobalId) return;
    
    const { data, error } = await supabase
      .from('sync_erp_api_keys')
      .select('*')
      .eq('fornecedor_global_id', fornecedorGlobalId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApiKeys(data as SyncErpApiKey[]);
    }
  };

  const createApiKey = async (nome: string): Promise<{ apiKey: string; error: string | null }> => {
    if (!fornecedorGlobalId) {
      return { apiKey: '', error: 'Fornecedor não identificado' };
    }

    // Gerar API Key aleatória
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const apiKey = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    // Calcular hash SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Salvar no banco (apenas o hash)
    const { error } = await supabase
      .from('sync_erp_api_keys')
      .insert({
        fornecedor_global_id: fornecedorGlobalId,
        nome,
        api_key_hash: hashHex,
        ativo: true
      });

    if (error) {
      return { apiKey: '', error: error.message };
    }

    await fetchApiKeys();
    return { apiKey, error: null };
  };

  const toggleApiKey = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from('sync_erp_api_keys')
      .update({ ativo })
      .eq('id', id);

    if (!error) {
      await fetchApiKeys();
    }
    return error;
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase
      .from('sync_erp_api_keys')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchApiKeys();
    }
    return error;
  };

  const refetch = async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchApiKeys()]);
    setLoading(false);
  };

  useEffect(() => {
    if (fornecedorGlobalId) {
      refetch();
    }
  }, [fornecedorGlobalId]);

  // Stats calculados
  const stats = {
    totalSyncs: logs.length,
    ultimaSync: logs[0]?.created_at || null,
    errosRecentes: logs.filter(l => l.registros_erro > 0).slice(0, 5).length,
    apiKeysAtivas: apiKeys.filter(k => k.ativo).length
  };

  return {
    logs,
    apiKeys,
    loading,
    stats,
    createApiKey,
    toggleApiKey,
    deleteApiKey,
    refetch
  };
};
