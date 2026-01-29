import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Search, ShoppingCart, Package } from 'lucide-react';
import { ProdutoCatalogo, ClienteFornecedor } from '@/hooks/useFornecedorData';
import { usePromocoesFornecedor } from '@/hooks/usePromocoesFornecedor';
import { useCarrinhoVendas, CarrinhoVendasProvider } from '@/hooks/useCarrinhoVendas';
import { CategoriasSidebar } from './CategoriasSidebar';
import { ProdutoVendaCard } from './ProdutoVendaCard';
import { CarrinhoDrawer } from './CarrinhoDrawer';

interface VendasTabContentProps {
  produtos: ProdutoCatalogo[];
  clientes: ClienteFornecedor[];
  fornecedorGlobalId: string | null;
  loading: boolean;
}

const VendasTabContent = ({
  produtos,
  clientes,
  fornecedorGlobalId,
  loading
}: VendasTabContentProps) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [carrinhoOpen, setCarrinhoOpen] = useState(false);

  const { promocoes, getPrecoFinal } = usePromocoesFornecedor(fornecedorGlobalId);
  const { totalItens, addItem } = useCarrinhoVendas();

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-[400px]" />
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de categorias (desktop) */}
        <div className="hidden lg:block">
          <CategoriasSidebar
            produtos={produtos}
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={setCategoriaAtiva}
          />
        </div>

        {/* Grid de produtos */}
        <div className="lg:col-span-3">
          {/* Filtro de categoria mobile */}
          <div className="lg:hidden mb-4">
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={categoriaAtiva || ''}
              onChange={(e) => setCategoriaAtiva(e.target.value || null)}
            >
              <option value="">Todas as categorias</option>
              {Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean))).map(cat => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>

          {produtosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nenhum produto encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou busca</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
}

export const VendasTab = (props: VendasTabProps) => {
  return (
    <CarrinhoVendasProvider>
      <VendasTabContent {...props} />
    </CarrinhoVendasProvider>
  );
};
