import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseIntegradoIdReturn {
  integradoId: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useIntegradoId = (): UseIntegradoIdReturn => {
  const { user } = useAuth();
  const [integradoId, setIntegradoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegradoId = async () => {
    if (!user?.id) {
      setIntegradoId(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('integrado_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching integrado_id:', error);
        // Fallback para o próprio user.id (dono da org)
        setIntegradoId(user.id);
      } else {
        // Se integrado_id for null, significa que é o dono da org
        setIntegradoId(data?.integrado_id || user.id);
      }
    } catch (error) {
      console.error('Error:', error);
      setIntegradoId(user.id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegradoId();
  }, [user?.id]);

  return { integradoId, loading, refetch: fetchIntegradoId };
};
