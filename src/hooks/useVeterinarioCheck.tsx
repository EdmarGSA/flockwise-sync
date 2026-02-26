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
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'veterinario')
          .maybeSingle();

        setIsVeterinario(!!data && !error);
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
