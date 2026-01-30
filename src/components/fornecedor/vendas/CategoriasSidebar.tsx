import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronRight } from 'lucide-react';
import { ProdutoCatalogo } from '@/hooks/useFornecedorData';
import { cn } from '@/lib/utils';

interface CategoriasSidebarProps {
  produtos: ProdutoCatalogo[];
  categoriaAtiva: string | null;
  onSelectCategoria: (categoria: string | null) => void;
  isInsideSheet?: boolean;
}

export const CategoriasSidebar = ({
  produtos,
  categoriaAtiva,
  onSelectCategoria,
  isInsideSheet = false
}: CategoriasSidebarProps) => {
  const categorias = useMemo(() => {
    const catMap = new Map<string, number>();
    
    produtos.forEach(p => {
      const cat = p.categoria || 'Sem categoria';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    return Array.from(catMap.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos]);

  const totalProdutos = produtos.length;

  return (
    <div className={cn(
      "w-full bg-card rounded-lg",
      !isInsideSheet && "h-full border p-4"
    )}>
      {!isInsideSheet && (
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
          Categorias
        </h3>
      )}
      
      <ScrollArea className={isInsideSheet ? "h-[calc(100vh-150px)]" : "h-[calc(100vh-300px)]"}>
        <div className="space-y-1">
          {/* Todos */}
          <Button
            variant={categoriaAtiva === null ? 'secondary' : 'ghost'}
            className="w-full justify-between h-auto py-2.5"
            onClick={() => onSelectCategoria(null)}
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Todos</span>
            </span>
            <Badge variant="outline" className="ml-2">
              {totalProdutos}
            </Badge>
          </Button>

          {/* Categorias */}
          {categorias.map(cat => (
            <Button
              key={cat.nome}
              variant={categoriaAtiva === cat.nome ? 'secondary' : 'ghost'}
              className="w-full justify-between h-auto py-2.5"
              onClick={() => onSelectCategoria(cat.nome)}
            >
              <span className="flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 transition-transform ${
                  categoriaAtiva === cat.nome ? 'rotate-90' : ''
                }`} />
                <span className="truncate">{cat.nome}</span>
              </span>
              <Badge variant="outline" className="ml-2">
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
