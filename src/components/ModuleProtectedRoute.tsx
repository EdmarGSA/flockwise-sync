import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ModuleProtectedRouteProps {
  moduleCode: string;
  children: React.ReactNode;
}

export function ModuleProtectedRoute({ moduleCode, children }: ModuleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('user_can_access_module' as any, {
          _user_id: user.id,
          _module_code: moduleCode
        });

        if (error) {
          console.error('Error checking module access:', error);
          setHasAccess(false);
        } else {
          setHasAccess((data as boolean) ?? false);
        }
      } catch (error) {
        console.error('Error:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAccess();
    }
  }, [user?.id, moduleCode, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
