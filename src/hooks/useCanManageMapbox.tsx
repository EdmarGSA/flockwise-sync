import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Indica se o usuário logado pode gerenciar (criar/editar/remover) o token
 * Mapbox da organização. Permitido para: admin, integrado, superadmin.
 */
export function useCanManageMapbox() {
  const { user } = useAuth();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.id) {
        setCanManage(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (cancelled) return;
      if (error || !data) {
        setCanManage(false);
      } else {
        const roles = data.map((r) => r.role as string);
        setCanManage(
          roles.includes('admin') ||
            roles.includes('integrado') ||
            roles.includes('superadmin'),
        );
      }
      setLoading(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { canManage, loading };
}
