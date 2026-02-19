import { Navigate } from 'react-router-dom';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-foreground">Verificando permissões...</p>
    </div>
  );
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useSuperAdminCheck();

  if (loading) return <LoadingScreen />;
  if (!isSuperAdmin) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
