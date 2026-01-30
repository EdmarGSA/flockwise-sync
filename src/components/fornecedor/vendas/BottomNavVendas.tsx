import { Home, LayoutGrid, ShoppingCart, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BottomNavVendasProps {
  onHomeClick: () => void;
  onCategoriasClick: () => void;
  onCarrinhoClick: () => void;
  onMenuClick: () => void;
  totalItensCarrinho: number;
  categoriaAtiva: string | null;
}

export const BottomNavVendas = ({
  onHomeClick,
  onCategoriasClick,
  onCarrinhoClick,
  onMenuClick,
  totalItensCarrinho,
  categoriaAtiva
}: BottomNavVendasProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
      <button
        onClick={onHomeClick}
        className="flex flex-col items-center gap-1 p-2 min-w-[60px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-5 w-5" />
        <span className="text-xs">Início</span>
      </button>

      <button
        onClick={onCategoriasClick}
        className={cn(
          "flex flex-col items-center gap-1 p-2 min-w-[60px] transition-colors",
          categoriaAtiva ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="text-xs">Categorias</span>
      </button>

      <button
        onClick={onCarrinhoClick}
        className="flex flex-col items-center gap-1 p-2 min-w-[60px] relative text-muted-foreground hover:text-foreground transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="text-xs">Carrinho</span>
        {totalItensCarrinho > 0 && (
          <Badge className="absolute -top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
            {totalItensCarrinho > 99 ? '99+' : totalItensCarrinho}
          </Badge>
        )}
      </button>

      <button
        onClick={onMenuClick}
        className="flex flex-col items-center gap-1 p-2 min-w-[60px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="text-xs">Menu</span>
      </button>
    </nav>
  );
};
