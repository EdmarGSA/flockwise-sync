import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package } from 'lucide-react';
import { ProdutoCatalogo, ClienteFornecedor } from '@/hooks/useFornecedorData';
import { usePromocoesFornecedor } from '@/hooks/usePromocoesFornecedor';
import { useCarrinhoVendas, CarrinhoVendasProvider } from '@/hooks/useCarrinhoVendas';
import { useIsMobile } from '@/hooks/use-mobile';
import { CategoriasSidebar } from './CategoriasSidebar';
import { ProdutoVendaCard } from './ProdutoVendaCard';
import { CarrinhoDrawer } from './CarrinhoDrawer';
import { BottomNavVendas } from './BottomNavVendas';
import { CategoriasSheet } from './CategoriasSheet';
import { MenuVendasSheet } from './MenuVendasSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendasTabContentProps {
  produtos: ProdutoCatalogo[];
  clientes: ClienteFornecedor[];
  fornecedorGlobalId: string | null;
  loading: boolean;
  onRefresh?: () => void;
}

const VendasTabContent = ({
  produtos,
  clientes,
  fornecedorGlobalId,
  loading,
  onRefresh
}: VendasTabContentProps) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [carrinhoOpen, setCarrinhoOpen] = useState(false);
  const [categoriasSheetOpen, setCategoriasSheetOpen] = useState(false);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  const { promocoes, getPrecoFinal } = usePromocoesFornecedor(fornecedorGlobalId);
  const { totalItens, addItem } = useCarrinhoVendas();
  const isMobile = useIsMobile();

  const produtosFiltrados = useMemo(() => {
    let filtered = produtos.filter(p => p.ativo);

    if (categoriaAtiva) {
      filtered = filtered.filter(p => p.categoria === categoriaAtiva);
    }

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtered = filtered.filter(p =>
        p.nome.toLowerCase().includes(termo) ||
        p.codigo_interno.toLowerCase().includes(termo) ||
        (p.marca && p.marca.toLowerCase().includes(termo))
      );
    }

    return filtered;
  }, [produtos, categoriaAtiva, busca]);

  const handleHomeClick = () => {
    setCategoriaAtiva(null);
    setBusca('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-[400px] hidden lg:block" />
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isMobile && "pb-20")}>
      {/* Header com busca e carrinho */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Botão carrinho - apenas desktop */}
        {!isMobile && (
          <Button
            variant="outline"
            className="relative gap-2"
            onClick={() => setCarrinhoOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {totalItens > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                {totalItens}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de categorias (desktop apenas) */}
        {!isMobile && (
          <div className="hidden lg:block">
            <CategoriasSidebar
              produtos={produtos}
              categoriaAtiva={categoriaAtiva}
              onSelectCategoria={setCategoriaAtiva}
            />
          </div>
        )}

        {/* Grid de produtos */}
        <div className={cn(!isMobile && "lg:col-span-3")}>
          {/* Filtro de categoria mobile - select simples quando não usa sheet */}
          {isMobile && categoriaAtiva && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {categoriaAtiva}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCategoriaAtiva(null)}
              >
                Limpar
              </Button>
            </div>
          )}

          {produtosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nenhum produto encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou busca</p>
            </div>
          ) : (
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            )}>
              {produtosFiltrados.map(produto => {
                const { preco, emPromocao, percentual } = getPrecoFinal(
                  produto.id,
                  produto.preco_tabela
                );

                return (
                  <ProdutoVendaCard
                    key={produto.id}
                    produto={produto}
                    precoFinal={preco}
                    emPromocao={emPromocao}
                    percentualDesconto={percentual}
                    onAddCarrinho={addItem}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra de navegação inferior - apenas mobile */}
      {isMobile && (
        <BottomNavVendas
          onHomeClick={handleHomeClick}
          onCategoriasClick={() => setCategoriasSheetOpen(true)}
          onCarrinhoClick={() => setCarrinhoOpen(true)}
          onMenuClick={() => setMenuSheetOpen(true)}
          totalItensCarrinho={totalItens}
          categoriaAtiva={categoriaAtiva}
        />
      )}

      {/* Sheet de Categorias - mobile */}
      <CategoriasSheet
        open={categoriasSheetOpen}
        onClose={() => setCategoriasSheetOpen(false)}
        produtos={produtos}
        categoriaAtiva={categoriaAtiva}
        onSelectCategoria={setCategoriaAtiva}
      />

      {/* Sheet de Menu - mobile */}
      <MenuVendasSheet
        open={menuSheetOpen}
        onClose={() => setMenuSheetOpen(false)}
        onRefresh={onRefresh}
      />

      {/* Drawer do Carrinho */}
      <CarrinhoDrawer
        open={carrinhoOpen}
        onClose={() => setCarrinhoOpen(false)}
        clientes={clientes}
      />
    </div>
  );
};

// Wrapper com Provider
interface VendasTabProps {
  produtos: ProdutoCatalogo[];
  clientes: ClienteFornecedor[];
  fornecedorGlobalId: string | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const VendasTab = (props: VendasTabProps) => {
  return (
    <CarrinhoVendasProvider>
      <VendasTabContent {...props} />
    </CarrinhoVendasProvider>
  );
};
