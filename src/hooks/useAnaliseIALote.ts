import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAnaliseIALote(loteId: string | undefined) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gerar = useCallback(async () => {
    if (!loteId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('relatorio-lote-diario', {
        body: { loteId }, method: 'POST',
        headers: {},
      });
      // Re-call com action=ia via URL não funciona em invoke; usar fetch direto:
      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/relatorio-lote-diario?action=ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ loteId }),
      });
      const json = await resp.json();
      if (!resp.ok || json.error) throw new Error(json.error || `Erro ${resp.status}`);
      setMarkdown(json.ia?.markdown || '');
      setCached(!!json.ia?.cached);
      setGeradoEm(json.ia?.gerado_em || null);
    } catch (e: any) {
      setError(e.message || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  return { markdown, cached, geradoEm, loading, error, gerar };
}
