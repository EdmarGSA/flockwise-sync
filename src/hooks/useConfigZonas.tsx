import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from './useIntegradoId';

export interface ConfigZonas {
  diasFimPinteiro: number;
  minMinutosSustentado: number;
  usarPercentisAutomacao: boolean;
}

const DEFAULTS: ConfigZonas = {
  diasFimPinteiro: 14,
  minMinutosSustentado: 20,
  usarPercentisAutomacao: false,
};

export function useConfigZonas(loteDiasFimPinteiro?: number | null) {
  const { integradoId } = useIntegradoId();
  const [config, setConfig] = useState<ConfigZonas>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!integradoId) { setLoading(false); return; }
      const { data } = await supabase
        .from('config_zonas_galpao')
        .select('dias_fim_pinteiro, min_minutos_sustentado, usar_percentis_automacao')
        .eq('integrado_id', integradoId)
        .maybeSingle();
      if (cancel) return;
      setConfig({
        diasFimPinteiro: data?.dias_fim_pinteiro ?? DEFAULTS.diasFimPinteiro,
        minMinutosSustentado: data?.min_minutos_sustentado ?? DEFAULTS.minMinutosSustentado,
        usarPercentisAutomacao: data?.usar_percentis_automacao ?? DEFAULTS.usarPercentisAutomacao,
      });
      setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [integradoId]);

  // Override por lote vence o default da org
  const efetivo: ConfigZonas = {
    ...config,
    diasFimPinteiro: loteDiasFimPinteiro ?? config.diasFimPinteiro,
  };

  return { config: efetivo, loading, integradoId };
}
