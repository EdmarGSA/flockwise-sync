import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AccessibleModule {
  codigo: string;
  nome: string;
  rota: string;
  icone: string;
  ordem: number;
  fonte_permissao: string;
}

export const useModuleAccess = () => {
  const { user } = useAuth();
  const [accessibleModules, setAccessibleModules] = useState<AccessibleModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccessibleModules = useCallback(async () => {
    if (!user?.id) {
      setAccessibleModules([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_accessible_modules' as any, {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching accessible modules:', error);
        setAccessibleModules([]);
      } else {
        setAccessibleModules((data as AccessibleModule[]) || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setAccessibleModules([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccessibleModules();
  }, [fetchAccessibleModules]);

  const canAccess = useCallback(async (moduleCode: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('user_can_access_module' as any, {
        _user_id: user.id,
        _module_code: moduleCode
      });

      if (error) {
        console.error('Error checking module access:', error);
        return false;
      }

      return (data as boolean) ?? false;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }, [user?.id]);

  const canAccessSync = useCallback((moduleCode: string): boolean => {
    return accessibleModules.some(m => m.codigo === moduleCode);
  }, [accessibleModules]);

  return { 
    accessibleModules, 
    loading, 
    canAccess, 
    canAccessSync,
    refetch: fetchAccessibleModules 
  };
};
