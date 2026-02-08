import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WebhookConfig {
  id: string;
  fornecedor_global_id: string;
  evento: string;
  url: string;
  secret: string | null;
  ativo: boolean;
  tentativas_max: number;
  timeout_ms: number;
  headers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string | null;
  fornecedor_global_id: string;
  evento: string;
  payload: Record<string, unknown>;
  tentativa: number;
  status_code: number | null;
  resposta: string | null;
  erro: string | null;
  duracao_ms: number | null;
  created_at: string;
}

interface CreateWebhookInput {
  evento: string;
  url: string;
  secret?: string;
  tentativas_max?: number;
  timeout_ms?: number;
  headers?: Record<string, string>;
}

export const useWebhooksFornecedor = (fornecedorGlobalId: string | null) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    if (!fornecedorGlobalId) return;

    const { data, error } = await supabase
      .from('webhooks_fornecedor')
      .select('*')
      .eq('fornecedor_global_id', fornecedorGlobalId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWebhooks(data as unknown as WebhookConfig[]);
    }
  }, [fornecedorGlobalId]);

  const fetchLogs = useCallback(async () => {
    if (!fornecedorGlobalId) return;

    const { data, error } = await supabase
      .from('webhooks_log')
      .select('*')
      .eq('fornecedor_global_id', fornecedorGlobalId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as unknown as WebhookLog[]);
    }
  }, [fornecedorGlobalId]);

  const createWebhook = async (input: CreateWebhookInput): Promise<{ error: string | null }> => {
    if (!fornecedorGlobalId) {
      return { error: 'Fornecedor não identificado' };
    }

    const { error } = await supabase
      .from('webhooks_fornecedor')
      .insert({
        fornecedor_global_id: fornecedorGlobalId,
        evento: input.evento,
        url: input.url,
        secret: input.secret || null,
        tentativas_max: input.tentativas_max || 3,
        timeout_ms: input.timeout_ms || 5000,
        headers: input.headers || {},
      });

    if (error) {
      return { error: error.message };
    }

    await fetchWebhooks();
    return { error: null };
  };

  const updateWebhook = async (
    id: string,
    updates: Partial<Omit<CreateWebhookInput, 'evento'>> & { ativo?: boolean }
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('webhooks_fornecedor')
      .update(updates)
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    await fetchWebhooks();
    return { error: null };
  };

  const deleteWebhook = async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('webhooks_fornecedor')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    await fetchWebhooks();
    return { error: null };
  };

  const toggleWebhook = async (id: string, ativo: boolean): Promise<{ error: string | null }> => {
    return updateWebhook(id, { ativo });
  };

  const testWebhook = async (webhookId: string): Promise<{ success: boolean; error?: string }> => {
    const webhook = webhooks.find((w) => w.id === webhookId);
    if (!webhook || !fornecedorGlobalId) {
      return { success: false, error: 'Webhook não encontrado' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
        body: {
          evento: webhook.evento,
          fornecedor_global_id: fornecedorGlobalId,
          dados: {
            test: true,
            message: 'Este é um teste de webhook',
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchLogs();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  };

  const refetch = async () => {
    setLoading(true);
    await Promise.all([fetchWebhooks(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    if (fornecedorGlobalId) {
      refetch();
    }
  }, [fornecedorGlobalId]);

  // Stats
  const stats = {
    total: webhooks.length,
    ativos: webhooks.filter((w) => w.ativo).length,
    errosRecentes: logs.filter((l) => l.erro || (l.status_code && l.status_code >= 400)).slice(0, 10).length,
    ultimoDisparo: logs[0]?.created_at || null,
  };

  return {
    webhooks,
    logs,
    loading,
    stats,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    refetch,
  };
};
