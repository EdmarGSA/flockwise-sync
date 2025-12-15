import { Button } from "@/components/ui/button";
import { Building2, LogOut, User, Settings, Icon } from "lucide-react";
import { barn } from "@lucide/lab";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoGSA from "@/assets/logo-gsa.png";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src={logoGSA} alt="GSA Tibiri" className="w-10 h-10 rounded-lg" />
          <span className="text-xl font-bold text-foreground">
            GSA <span className="text-[#2E7D32]">Tibiri</span>
          </span>
        </a>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#modulos" className="text-muted-foreground hover:text-foreground transition-colors">
            Módulos
          </a>
          <a href="#funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">
            Funcionalidades
          </a>
          <a href="#contato" className="text-muted-foreground hover:text-foreground transition-colors">
            Contato
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/configuracoes')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem 
                  onClick={() => navigate('/dashboard')}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/gestao-lotes')}
                  className="cursor-pointer"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Gestão de Lotes
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
              <Button variant="hero" size="sm" onClick={() => navigate('/auth')}>
                Solicitar Demo
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
