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
      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
      const PUB_KEY = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/relatorio-lote-diario?action=ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': PUB_KEY,
          'Authorization': `Bearer ${session?.access_token || PUB_KEY}`,
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
