import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Search, ArrowRight, Loader2, TrendingUp, Clock } from 'lucide-react';

interface GrupoProduto {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string;
  fator_conversao: number;
  grupo_produto_id: string | null;
}

interface ProdutoSelecionado extends Produto {
  quantidade: number;
}

interface OCManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integradoId: string;
  onContinue: (produtos: ProdutoSelecionado[]) => void;
}

export default function OCManualDialog({
  open,
  onOpenChange,
  integradoId,
  onContinue
}: OCManualDialogProps) {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [precosTabela, setPrecosTabela] = useState<Map<string, number>>(new Map());
  const [ultimosPrecos, setUltimosPrecos] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (open && integradoId) {
      fetchGrupos();
      fetchProdutos();
    }
  }, [open, integradoId]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setGrupoFiltro('todos');
      setSelectedProducts(new Map());
    }
  }, [open]);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos_produto')
        .select('id, nome')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    }
  };

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      // Fetch products with "terceiros" category (purchasable items)
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, sku, estoque_atual, estoque_minimo, unidade_medida, unidade_compra, fator_conversao, grupo_produto_id, categorias!inner(tipo_origem)')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'terceiros')
        .order('nome');

      if (error) throw error;

      const produtosList = (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        sku: p.sku,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        unidade_medida: p.unidade_medida,
        unidade_compra: p.unidade_compra || 'UN',
        fator_conversao: p.fator_conversao || 1,
        grupo_produto_id: p.grupo_produto_id
      }));

      setProdutos(produtosList);

      // Fetch price data after products are loaded
      if (produtosList.length > 0) {
        const produtoIds = produtosList.map(p => p.id);
        await Promise.all([
          fetchPrecosTabela(produtoIds),
          fetchUltimosPrecos(produtoIds)
        ]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrecosTabela = async (produtoIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('produto_fornecedor')
        .select('produto_id, preco_compra')
        .in('produto_id', produtoIds)
        .eq('ativo', true);

      if (error) throw error;

      // Group by product and get minimum price
      const precosPorProduto = new Map<string, number>();
      (data || []).forEach(pf => {
        const current = precosPorProduto.get(pf.produto_id);
        if (current === undefined || pf.preco_compra < current) {
          precosPorProduto.set(pf.produto_id, pf.preco_compra);
        }
      });
      setPrecosTabela(precosPorProduto);
    } catch (error) {
      console.error('Erro ao buscar preços de tabela:', error);
    }
  };

  const fetchUltimosPrecos = async (produtoIds: string[]) => {
    try {
      // Get last approved/received OC price for each product
      const { data, error } = await supabase
        .from('ordens_compra_itens')
        .select(`
          produto_id,
          preco_unitario,
          ordens_compra!inner(status, created_at)
        `)
        .in('produto_id', produtoIds)
        .in('ordens_compra.status', ['aprovada', 'recebida'])
        .order('ordens_compra(created_at)', { ascending: false });

      if (error) throw error;

      // Get the most recent price for each product
      const ultimosPorProduto = new Map<string, number>();
      (data || []).forEach(item => {
        if (!ultimosPorProduto.has(item.produto_id)) {
          ultimosPorProduto.set(item.produto_id, item.preco_unitario);
        }
      });
      setUltimosPrecos(ultimosPorProduto);
    } catch (error) {
      console.error('Erro ao buscar últimos preços:', error);
    }
  };

  const filteredProdutos = useMemo(() => {
    let filtered = produtos;
    
    // Filter by group
    if (grupoFiltro !== 'todos') {
      filtered = filtered.filter(p => p.grupo_produto_id === grupoFiltro);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [produtos, searchTerm, grupoFiltro]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      if (newMap.has(productId)) {
        newMap.delete(productId);
      } else {
        // Default quantity suggestion: difference to minimum stock or 100
        const produto = produtos.find(p => p.id === productId);
        const suggestedQty = produto && produto.estoque_atual < produto.estoque_minimo
          ? Math.ceil((produto.estoque_minimo - produto.estoque_atual) / (produto.fator_conversao || 1))
          : 100;
        newMap.set(productId, suggestedQty);
      }
      return newMap;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev);
      if (quantity > 0) {
        newMap.set(productId, quantity);
      }
      return newMap;
    });
  };

  const handleContinue = () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    const produtosSelecionados: ProdutoSelecionado[] = [];
    selectedProducts.forEach((quantidade, produtoId) => {
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        produtosSelecionados.push({ ...produto, quantidade });
      }
    });

    onContinue(produtosSelecionados);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            OC Manual - Selecionar Produtos
          </DialogTitle>
          <DialogDescription>
            Busque e selecione os produtos que deseja comprar, depois compare fornecedores
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredProdutos.length} produto(s) encontrado(s)
            </span>
            <Badge variant="outline" className="text-primary">
              {selectedProducts.size} selecionado(s)
            </Badge>
          </div>

          {/* Products list */}
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              Carregando produtos...
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredProdutos.map((produto) => {
                const isSelected = selectedProducts.has(produto.id);
                const quantidade = selectedProducts.get(produto.id) || 0;
                const isLowStock = produto.estoque_atual < produto.estoque_minimo;

                return (
                  <div
                    key={produto.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProduct(produto.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{produto.nome}</span>
                        {isLowStock && (
                          <Badge variant="destructive" className="text-xs">
                            Baixo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>SKU: {produto.sku}</span>
                        <span>Estoque: {produto.estoque_atual} {produto.unidade_medida}</span>
                        <span>Mín: {produto.estoque_minimo} {produto.unidade_medida}</span>
                      </div>
                      {/* Price info */}
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        {precosTabela.has(produto.id) ? (
                          <span className="flex items-center gap-1 text-primary">
                            <TrendingUp className="w-3 h-3" />
                            Tabela: R$ {precosTabela.get(produto.id)?.toFixed(2)}/{produto.unidade_compra}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground/60">
                            <TrendingUp className="w-3 h-3" />
                            Sem fornecedor
                          </span>
                        )}
                        {ultimosPrecos.has(produto.id) ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Última: R$ {ultimosPrecos.get(produto.id)?.toFixed(2)}/{produto.unidade_compra}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground/60">
                            <Clock className="w-3 h-3" />
                            Sem compras
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={quantidade}
                          onChange={(e) => updateQuantity(produto.id, Number(e.target.value))}
                          className="w-24 h-8 text-right"
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground w-8">
                          {produto.unidade_compra}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleContinue} 
              disabled={selectedProducts.size === 0}
            >
              Comparar Fornecedores
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
