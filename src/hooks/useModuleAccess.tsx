import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type NivelAcesso = 'view' | 'edit' | 'full';

interface AccessibleModule {
  codigo: string;
  nome: string;
  rota: string;
  icone: string;
  ordem: number;
  fonte_permissao: string;
  nivel_acesso: NivelAcesso;
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

    const fetchOnce = async () => {
      const { data, error } = await supabase.rpc('get_user_accessible_modules' as any, {
        _user_id: user.id,
      });
      if (error) throw error;
      return ((data as any[]) || []).map(m => ({
        ...m,
        nivel_acesso: (m.nivel_acesso || 'view') as NivelAcesso,
      }));
    };

    try {
      let modules = await fetchOnce();

      // Auto-heal: dono de org sem admin (lista vazia ou muito reduzida)
      // chama ensure_my_admin_role e refaz a busca se algo foi corrigido.
      if (modules.length < 3) {
        try {
          const { data: fixed } = await supabase.rpc('ensure_my_admin_role' as any);
          if (fixed === true) {
            modules = await fetchOnce();
          } else if (modules.length === 0) {
            // Retry curto: trigger pode ainda estar comitando após signup
            await new Promise(r => setTimeout(r, 800));
            modules = await fetchOnce();
          }
        } catch (e) {
          console.warn('ensure_my_admin_role failed:', e);
        }
      }

      setAccessibleModules(modules);
    } catch (error) {
      console.error('Error fetching accessible modules:', error);
      setAccessibleModules([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccessibleModules();
  }, [fetchAccessibleModules]);

  const canAccess = useCallback(async (moduleCode: string, requiredLevel: NivelAcesso = 'view'): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('user_can_access_module' as any, {
        _user_id: user.id,
        _module_code: moduleCode,
        _required_level: requiredLevel
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

  const getAccessLevel = useCallback((moduleCode: string): NivelAcesso | null => {
    const module = accessibleModules.find(m => m.codigo === moduleCode);
    return module?.nivel_acesso || null;
  }, [accessibleModules]);

  const canEdit = useCallback((moduleCode: string): boolean => {
    const level = getAccessLevel(moduleCode);
    return level === 'edit' || level === 'full';
  }, [getAccessLevel]);

  const canDelete = useCallback((moduleCode: string): boolean => {
    const level = getAccessLevel(moduleCode);
    return level === 'full';
  }, [getAccessLevel]);

  const hasFullAccess = useCallback((moduleCode: string): boolean => {
    const level = getAccessLevel(moduleCode);
    return level === 'full';
  }, [getAccessLevel]);

  return { 
    accessibleModules, 
    loading, 
    canAccess, 
    canAccessSync,
    getAccessLevel,
    canEdit,
    canDelete,
    hasFullAccess,
    refetch: fetchAccessibleModules 
  };
};
