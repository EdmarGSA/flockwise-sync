import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';

interface MapboxConfig {
  id: string;
  public_token: string;
  default_lat: number | null;
  default_lng: number | null;
  default_zoom: number | null;
}

export function useMapboxToken() {
  const { integradoId } = useIntegradoId();
  const [config, setConfig] = useState<MapboxConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    if (!integradoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('mapbox_config')
      .select('id, public_token, default_lat, default_lng, default_zoom')
      .eq('integrado_id', integradoId)
      .maybeSingle();

    if (!error && data) setConfig(data as MapboxConfig);
    else setConfig(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, [integradoId]);

  return { config, loading, refetch: fetchConfig, integradoId };
}
