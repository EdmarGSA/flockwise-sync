import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, ArrowRight, Loader2, AlertTriangle, Clock } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  unidade_compra: string;
  fator_conversao: number;
  quantidade: number;
}

interface FornecedorProduto {
  id: string;
  parceiro_id: string;
  razao_social_nome: string;
  preco_compra: number;
  prazo_entrega_dias: number;
}

interface ProdutoComFornecedores extends Produto {
  fornecedores: FornecedorProduto[];
  fornecedorSelecionado: string | null;
}

interface ComparativoFornecedoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: Produto[];
  integradoId: string;
  onSuccess: () => void;
}

export default function ComparativoFornecedoresDialog({
  open,
  onOpenChange,
  produtos,
  integradoId,
  onSuccess
}: ComparativoFornecedoresDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [produtosComFornecedores, setProdutosComFornecedores] = useState<ProdutoComFornecedores[]>([]);

  useEffect(() => {
    if (open && produtos.length > 0) {
      fetchFornecedores();
    }
  }, [open, produtos]);

  useEffect(() => {
    if (!open) {
      setProdutosComFornecedores([]);
    }
  }, [open]);

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const produtoIds = produtos.map(p => p.id);

      const { data: fornecedoresData, error } = await supabase
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

      const produtosEnriquecidos: ProdutoComFornecedores[] = produtos.map(produto => {
        const fornecedoresProduto = (fornecedoresData || [])
          .filter(f => f.produto_id === produto.id)
          .map(f => ({
            id: f.id,
            parceiro_id: f.parceiro_id,
            razao_social_nome: (f.parceiros as any).razao_social_nome,
            preco_compra: f.preco_compra || 0,
            prazo_entrega_dias: f.prazo_entrega_dias || 0
          }))
          .sort((a, b) => a.preco_compra - b.preco_compra);

        return {
          ...produto,
          fornecedores: fornecedoresProduto,
          fornecedorSelecionado: fornecedoresProduto.length > 0 ? fornecedoresProduto[0].parceiro_id : null
        };
      });

      setProdutosComFornecedores(produtosEnriquecidos);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFornecedor = (produtoId: string, fornecedorId: string) => {
    setProdutosComFornecedores(prev => 
      prev.map(p => 
        p.id === produtoId 
          ? { ...p, fornecedorSelecionado: fornecedorId }
          : p
      )
    );
  };

  // Group selected products by supplier
  const ocsAgrupadas = useMemo(() => {
    const map = new Map<string, { fornecedor: FornecedorProduto; produtos: ProdutoComFornecedores[] }>();

    produtosComFornecedores.forEach(produto => {
      if (!produto.fornecedorSelecionado) return;
      
      const fornecedor = produto.fornecedores.find(f => f.parceiro_id === produto.fornecedorSelecionado);
      if (!fornecedor) return;

      const existing = map.get(fornecedor.parceiro_id);
      if (existing) {
        existing.produtos.push(produto);
      } else {
        map.set(fornecedor.parceiro_id, {
          fornecedor,
          produtos: [produto]
        });
      }
    });

    return Array.from(map.values());
  }, [produtosComFornecedores]);

  const produtosSemFornecedor = produtosComFornecedores.filter(p => p.fornecedores.length === 0);
  const produtosSemSelecao = produtosComFornecedores.filter(p => p.fornecedores.length > 0 && !p.fornecedorSelecionado);

  const handleGerarOCs = async () => {
    if (ocsAgrupadas.length === 0) {
      toast.error('Nenhum produto com fornecedor selecionado');
      return;
    }

    setSaving(true);
    try {
      // Create one OC per supplier
      for (const grupo of ocsAgrupadas) {
        // Calculate total value
        let valorTotal = 0;
        const itens = grupo.produtos.map(produto => {
          const fornecedor = produto.fornecedores.find(f => f.parceiro_id === grupo.fornecedor.parceiro_id);
          const precoUnitario = fornecedor?.preco_compra || 0;
          const subtotal = precoUnitario * produto.quantidade;
          valorTotal += subtotal;

          return {
            produto_id: produto.id,
            quantidade: produto.quantidade,
            unidade_compra: produto.unidade_compra,
            preco_unitario: precoUnitario,
            subtotal
          };
        });

        // Create OC
        const { data: oc, error: ocError } = await supabase
          .from('ordens_compra')
          .insert([{
            integrado_id: integradoId,
            parceiro_id: grupo.fornecedor.parceiro_id,
            status: 'rascunho',
            valor_total: valorTotal,
            observacoes: 'OC criada via compra manual'
          }])
          .select('id')
          .single();

        if (ocError) throw ocError;

        // Create OC items
        const itensParaInserir = itens.map(item => ({
          ordem_compra_id: oc.id,
          ...item
        }));

        const { error: itensError } = await supabase
          .from('ordens_compra_itens')
          .insert(itensParaInserir);

        if (itensError) throw itensError;
      }

      toast.success(`${ocsAgrupadas.length} ordem(s) de compra criada(s) com sucesso!`);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar OCs:', error);
      toast.error('Erro ao criar ordens de compra');
    } finally {
      setSaving(false);
    }
  };

  const totalOCs = ocsAgrupadas.length;
  const totalValor = ocsAgrupadas.reduce((sum, grupo) => {
    return sum + grupo.produtos.reduce((pSum, produto) => {
      const fornecedor = produto.fornecedores.find(f => f.parceiro_id === grupo.fornecedor.parceiro_id);
      return pSum + (fornecedor?.preco_compra || 0) * produto.quantidade;
    }, 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Comparativo de Fornecedores
          </DialogTitle>
          <DialogDescription>
            Selecione o fornecedor para cada produto. Produtos serão agrupados por fornecedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              Carregando fornecedores...
            </div>
          ) : (
            <>
              {/* Products with suppliers */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {produtosComFornecedores.filter(p => p.fornecedores.length > 0).map((produto) => (
                  <div
                    key={produto.id}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="font-medium">{produto.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {produto.quantidade} {produto.unidade_compra}
                        </Badge>
                      </div>
                    </div>

                    <RadioGroup
                      value={produto.fornecedorSelecionado || ''}
                      onValueChange={(value) => handleSelectFornecedor(produto.id, value)}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      {produto.fornecedores.map((fornecedor, index) => {
                        const isBestPrice = index === 0 && produto.fornecedores.length > 1;
                        const subtotal = fornecedor.preco_compra * produto.quantidade;

                        return (
                          <div
                            key={fornecedor.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                              produto.fornecedorSelecionado === fornecedor.parceiro_id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleSelectFornecedor(produto.id, fornecedor.parceiro_id)}
                          >
                            <RadioGroupItem
                              value={fornecedor.parceiro_id}
                              id={`${produto.id}-${fornecedor.parceiro_id}`}
                            />
                            <Label 
                              htmlFor={`${produto.id}-${fornecedor.parceiro_id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{fornecedor.razao_social_nome}</span>
                                {isBestPrice && (
                                  <Badge className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                                    Menor preço
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="font-medium text-foreground">
                                  R$ {fornecedor.preco_compra.toFixed(2)}/{produto.unidade_compra}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {fornecedor.prazo_entrega_dias} dias
                                </span>
                                <span className="text-primary font-medium">
                                  Total: R$ {subtotal.toFixed(2)}
                                </span>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>
                ))}
              </div>

              {/* Products without suppliers */}
              {produtosSemFornecedor.length > 0 && (
                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Produtos sem fornecedor cadastrado</span>
                  </div>
                  <div className="space-y-1">
                    {produtosSemFornecedor.map(produto => (
                      <p key={produto.id} className="text-sm text-muted-foreground">
                        • {produto.nome} ({produto.quantidade} {produto.unidade_compra})
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-destructive mt-2">
                    Estes produtos não serão incluídos nas OCs. Cadastre fornecedores em Configurações → Produtos.
                  </p>
                </div>
              )}

              {/* Summary */}
              {ocsAgrupadas.length > 0 && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Resumo</span>
                    <Badge variant="outline" className="text-primary">
                      {totalOCs} OC(s) a criar
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {ocsAgrupadas.map(grupo => (
                      <div key={grupo.fornecedor.parceiro_id} className="flex items-center justify-between">
                        <span>{grupo.fornecedor.razao_social_nome} ({grupo.produtos.length} itens)</span>
                        <span className="font-medium text-foreground">
                          R$ {grupo.produtos.reduce((sum, p) => {
                            const f = p.fornecedores.find(f => f.parceiro_id === grupo.fornecedor.parceiro_id);
                            return sum + (f?.preco_compra || 0) * p.quantidade;
                          }, 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="font-medium">Total Geral</span>
                    <span className="font-bold text-primary text-lg">
                      R$ {totalValor.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button 
              onClick={handleGerarOCs} 
              disabled={ocsAgrupadas.length === 0 || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  Gerar {totalOCs} OC(s)
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
