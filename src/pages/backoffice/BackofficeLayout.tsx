import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BackofficeSidebar } from './BackofficeSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import logoGSA from '@/assets/logo-gsa.png';

export default function BackofficeLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <BackofficeSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={logoGSA} alt="GSA" className="w-7 h-7 rounded" />
              <span className="font-bold text-foreground">
                Backoffice <span className="text-primary">Admin</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigate('/home')} title="Voltar ao sistema">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/'); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
