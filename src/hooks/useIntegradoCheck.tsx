import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface IntegradoCheckResult {
  isIntegrado: boolean;
  loading: boolean;
}

export const useIntegradoCheck = (): IntegradoCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [isIntegrado, setIsIntegrado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsIntegrado(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        setIsIntegrado(!error && data?.role === 'integrado');
      } catch {
        setIsIntegrado(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, authLoading]);

  return { isIntegrado, loading: loading || authLoading };
};
