import { useCallback, useEffect, useState } from 'react';
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
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!integradoId) { setLoading(false); return; }
    const { data } = await supabase
      .from('config_zonas_galpao')
      .select('dias_fim_pinteiro, min_minutos_sustentado, usar_percentis_automacao')
      .eq('integrado_id', integradoId)
      .maybeSingle();
    setConfig({
      diasFimPinteiro: data?.dias_fim_pinteiro ?? DEFAULTS.diasFimPinteiro,
      minMinutosSustentado: data?.min_minutos_sustentado ?? DEFAULTS.minMinutosSustentado,
      usarPercentisAutomacao: data?.usar_percentis_automacao ?? DEFAULTS.usarPercentisAutomacao,
    });
    setLoading(false);
  }, [integradoId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (cancel) return;
      await load();
    })();
    return () => { cancel = true; };
  }, [load]);

  const salvar = useCallback(async (patch: Partial<ConfigZonas>) => {
    if (!integradoId) throw new Error('Sem integrado_id');
    setSaving(true);
    const novo: ConfigZonas = { ...config, ...patch };
    const { error } = await supabase
      .from('config_zonas_galpao')
      .upsert({
        integrado_id: integradoId,
        dias_fim_pinteiro: novo.diasFimPinteiro,
        min_minutos_sustentado: novo.minMinutosSustentado,
        usar_percentis_automacao: novo.usarPercentisAutomacao,
      }, { onConflict: 'integrado_id' });
    setSaving(false);
    if (error) throw error;
    setConfig(novo);
    return novo;
  }, [config, integradoId]);

  // Override por lote vence o default da org
  const efetivo: ConfigZonas = {
    ...config,
    diasFimPinteiro: loteDiasFimPinteiro ?? config.diasFimPinteiro,
  };

  return { config: efetivo, configOrg: config, loading, saving, integradoId, salvar, recarregar: load };
}
