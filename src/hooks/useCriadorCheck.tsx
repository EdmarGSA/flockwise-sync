import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CriadorCheckResult {
  isCriador: boolean;
  loading: boolean;
}

export const useCriadorCheck = (): CriadorCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [isCriador, setIsCriador] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsCriador(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'criador')
          .maybeSingle();

        setIsCriador(!!data && !error);
      } catch {
        setIsCriador(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, authLoading]);

  return { isCriador, loading: loading || authLoading };
};
