import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, ArrowRight, Truck, Clock, ShoppingCart } from 'lucide-react';
import ConsolidacaoCompraDialog from './ConsolidacaoCompraDialog';

interface ProdutoCritico {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string;
  fator_conversao: number;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
}

interface ProdutoComFornecedor extends ProdutoCritico {
  fornecedores: {
    id: string;
    parceiro_id: string;
    razao_social_nome: string;
    preco_compra: number;
    prazo_entrega_dias: number;
  }[];
}

interface ProdutosCriticosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoCritico[];
  integradoId: string;
  onSuccess: () => void;
}

export default function ProdutosCriticosDialog({
  open,
  onOpenChange,
  produtos,
  integradoId,
  onSuccess
}: ProdutosCriticosDialogProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [produtosComFornecedor, setProdutosComFornecedor] = useState<ProdutoComFornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConsolidacao, setShowConsolidacao] = useState(false);

  useEffect(() => {
    if (open && produtos.length > 0) {
      fetchFornecedoresProdutos();
    }
  }, [open, produtos]);

  const fetchFornecedoresProdutos = async () => {
    setLoading(true);
    try {
      const produtoIds = produtos.map(p => p.id);
      
      const { data: fornecedores, error } = await supabase
        .from('produto_fornecedor')
        .select(`
          id,
          produto_id,
          parceiro_id,
          preco_compra,
          prazo_entrega_dias,
          parceiros!inner(razao_social_nome)
        `)
        .in('produto_id', produtoIds)
        .eq('ativo', true);

      if (error) throw error;

      const produtosEnriquecidos: ProdutoComFornecedor[] = produtos.map(produto => ({
        ...produto,
        fornecedores: (fornecedores || [])
          .filter(f => f.produto_id === produto.id)
          .map(f => ({
            id: f.id,
            parceiro_id: f.parceiro_id,
            razao_social_nome: (f.parceiros as any).razao_social_nome,
            preco_compra: f.preco_compra || 0,
            prazo_entrega_dias: f.prazo_entrega_dias || 0
          }))
      }));

      setProdutosComFornecedor(produtosEnriquecidos);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    if (selectedProducts.length === produtosComFornecedor.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(produtosComFornecedor.map(p => p.id));
    }
  };

  const handleConsolidar = () => {
    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }
    setShowConsolidacao(true);
  };

  const selectedProdutos = produtosComFornecedor.filter(p => selectedProducts.includes(p.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produtos Críticos para Compra
            </DialogTitle>
            <DialogDescription>
              Selecione os produtos que deseja incluir na ordem de compra
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : produtosComFornecedor.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">
                Nenhum produto em situação crítica
              </p>
              <Button onClick={() => setShowConsolidacao(true)}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Continuar com Nova Compra
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedProducts.length === produtosComFornecedor.length}
                    onCheckedChange={selectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Selecionar Todos ({produtosComFornecedor.length})
                  </label>
                </div>
                <Badge variant="outline" className="text-primary">
                  {selectedProducts.length} selecionado(s)
                </Badge>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {produtosComFornecedor.map((produto) => (
                  <div
                    key={produto.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      selectedProducts.includes(produto.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedProducts.includes(produto.id)}
                      onCheckedChange={() => toggleProduct(produto.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{produto.nome}</span>
                        <Badge 
                          variant={produto.nivel_critico === 'critico' ? 'destructive' : 'default'}
                          className={produto.nivel_critico === 'atencao' ? 'bg-yellow-500' : ''}
                        >
                          {produto.nivel_critico === 'critico' ? 'Crítico' : 'Atenção'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>SKU: {produto.sku}</span>
                        <span>Estoque: {produto.estoque_atual} {produto.unidade_medida}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {produto.dias_restantes >= 999 ? '∞' : produto.dias_restantes} dias
                        </span>
                      </div>
                      {produto.fornecedores.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Truck className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {produto.fornecedores.length} fornecedor(es): {' '}
                            {produto.fornecedores.slice(0, 2).map(f => f.razao_social_nome).join(', ')}
                            {produto.fornecedores.length > 2 && '...'}
                          </span>
                        </div>
                      )}
                      {produto.fornecedores.length === 0 && (
                        <p className="text-xs text-destructive mt-2">
                          Nenhum fornecedor cadastrado
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConsolidar} disabled={selectedProducts.length === 0}>
                  Consolidar Selecionados
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConsolidacaoCompraDialog
        open={showConsolidacao}
        onOpenChange={setShowConsolidacao}
        produtos={selectedProdutos}
        integradoId={integradoId}
        onSuccess={() => {
          setShowConsolidacao(false);
          onOpenChange(false);
          setSelectedProducts([]);
          onSuccess();
        }}
      />
    </>
  );
}
