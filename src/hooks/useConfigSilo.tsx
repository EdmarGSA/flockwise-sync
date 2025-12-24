import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';

export interface ConfigSilo {
  id?: string;
  diasCritico: number;
  diasAtencao: number;
  diasOk: number;
  diasEstoqueSugerido: number;
}

const DEFAULT_CONFIG: ConfigSilo = {
  diasCritico: 2,
  diasAtencao: 4,
  diasOk: 5,
  diasEstoqueSugerido: 7,
};

export function useConfigSilo() {
  const { user } = useAuth();
  const { integradoId, loading: integradoLoading } = useIntegradoId();
  const [config, setConfig] = useState<ConfigSilo>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (integradoId && !integradoLoading) {
      fetchConfig();
    }
  }, [integradoId, integradoLoading]);

  const fetchConfig = async () => {
    if (!integradoId) return;
    
    try {
      const { data, error } = await supabase
        .from('config_silo')
        .select('*')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar config_silo:', error);
      }

      if (data) {
        setConfig({
          id: data.id,
          diasCritico: data.dias_critico,
          diasAtencao: data.dias_atencao,
          diasOk: data.dias_ok,
          diasEstoqueSugerido: data.dias_estoque_sugerido,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configuração do silo:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: Omit<ConfigSilo, 'id'>) => {
    if (!integradoId) return false;

    try {
      const payload = {
        integrado_id: integradoId,
        dias_critico: newConfig.diasCritico,
        dias_atencao: newConfig.diasAtencao,
        dias_ok: newConfig.diasOk,
        dias_estoque_sugerido: newConfig.diasEstoqueSugerido,
      };

      if (config.id) {
        const { error } = await supabase
          .from('config_silo')
          .update(payload)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('config_silo')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }

      setConfig(prev => ({ ...prev, ...newConfig }));
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração do silo:', error);
      return false;
    }
  };

  return { config, loading: loading || integradoLoading, saveConfig, refetch: fetchConfig };
}