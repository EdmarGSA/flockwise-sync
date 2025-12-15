import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ConfigFechamento {
  id: string;
  integrado_id: string;
  constante_ajuste_ca: number;
}

export function useConfigFechamento() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigFechamento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('config_fechamento')
      .select('*')
      .eq('integrado_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar config_fechamento:', error);
    } else if (data) {
      setConfig(data as ConfigFechamento);
    }
    setLoading(false);
  };

  const saveConfig = async (constanteAjusteCA: number): Promise<boolean> => {
    if (!user) return false;

    if (config) {
      // Update existing
      const { error } = await supabase
        .from('config_fechamento')
        .update({ constante_ajuste_ca: constanteAjusteCA })
        .eq('id', config.id);

      if (error) {
        console.error('Erro ao atualizar config_fechamento:', error);
        return false;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('config_fechamento')
        .insert({
          integrado_id: user.id,
          constante_ajuste_ca: constanteAjusteCA
        });

      if (error) {
        console.error('Erro ao inserir config_fechamento:', error);
        return false;
      }
    }

    await fetchConfig();
    return true;
  };

  // Default value is 3.8 if not configured
  const constanteAjusteCA = config?.constante_ajuste_ca ?? 3.8;

  return {
    config,
    constanteAjusteCA,
    loading,
    saveConfig,
    refetch: fetchConfig
  };
}
