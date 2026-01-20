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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Search, ArrowRight, Loader2 } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string;
  fator_conversao: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (open && integradoId) {
      fetchProdutos();
    }
  }, [open, integradoId]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedProducts(new Map());
    }
  }, [open]);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      // Fetch products with "terceiros" category (purchasable items)
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, sku, estoque_atual, estoque_minimo, unidade_medida, unidade_compra, fator_conversao, categorias!inner(tipo_origem)')
        .eq('integrado_id', integradoId)
        .eq('ativo', true)
        .eq('categorias.tipo_origem', 'terceiros')
        .order('nome');

      if (error) throw error;

      setProdutos((data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        sku: p.sku,
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        unidade_medida: p.unidade_medida,
        unidade_compra: p.unidade_compra || 'UN',
        fator_conversao: p.fator_conversao || 1
      })));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = useMemo(() => {
    if (!searchTerm) return produtos;
    const term = searchTerm.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term)
    );
  }, [produtos, searchTerm]);

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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
