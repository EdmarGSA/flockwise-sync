import { Button } from "@/components/ui/button";
import { Bird } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Bird className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Avi<span className="text-primary">Gestão</span>
          </span>
        </div>
        
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
          <Button variant="ghost" size="sm">
            Entrar
          </Button>
          <Button variant="hero" size="sm">
            Solicitar Demo
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
