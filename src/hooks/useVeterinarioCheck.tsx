import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VeterinarioCheckResult {
  isVeterinario: boolean;
  loading: boolean;
}

export const useVeterinarioCheck = (): VeterinarioCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [isVeterinario, setIsVeterinario] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsVeterinario(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        setIsVeterinario(!error && data?.role === 'veterinario');
      } catch {
        setIsVeterinario(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, authLoading]);

  return { isVeterinario, loading: loading || authLoading };
};
