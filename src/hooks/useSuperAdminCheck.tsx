import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SuperAdminCheckResult {
  isSuperAdmin: boolean | null;
  loading: boolean;
}

export const useSuperAdminCheck = (): SuperAdminCheckResult => {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .maybeSingle();

        setIsSuperAdmin(!!data && !error);
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user, authLoading]);

  return { isSuperAdmin, loading: loading || authLoading };
};
