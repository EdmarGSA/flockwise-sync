import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, ArrowRight } from 'lucide-react';
import NovaOrdemCompraDialog from './NovaOrdemCompraDialog';

interface Fornecedor {
  id: string;
  parceiro_id: string;
  razao_social_nome: string;
  preco_compra: number;
  prazo_entrega_dias: number;
}

interface ProdutoComFornecedor {
  id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  consumo_medio_diario: number;
  dias_restantes: number;
  nivel_critico: 'critico' | 'atencao' | 'ok';
  fornecedores: Fornecedor[];
}

interface ConsolidacaoCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoComFornecedor[];
  integradoId: string;
  onSuccess: () => void;
}

interface FornecedorAgrupado {
  parceiro_id: string;
  razao_social_nome: string;
  produtos: {
    produto: ProdutoComFornecedor;
    preco_compra: number;
    prazo_entrega_dias: number;
  }[];
}

export default function ConsolidacaoCompraDialog({
  open,
  onOpenChange,
  produtos,
  integradoId,
  onSuccess
}: ConsolidacaoCompraDialogProps) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorAgrupado | null>(null);
  const [showNovaOC, setShowNovaOC] = useState(false);

  // Group products by supplier
  const fornecedoresAgrupados = useMemo(() => {
    const map = new Map<string, FornecedorAgrupado>();

    produtos.forEach(produto => {
      produto.fornecedores.forEach(fornecedor => {
        const existing = map.get(fornecedor.parceiro_id);
        if (existing) {
          existing.produtos.push({
            produto,
            preco_compra: fornecedor.preco_compra,
            prazo_entrega_dias: fornecedor.prazo_entrega_dias
          });
        } else {
          map.set(fornecedor.parceiro_id, {
            parceiro_id: fornecedor.parceiro_id,
            razao_social_nome: fornecedor.razao_social_nome,
            produtos: [{
              produto,
              preco_compra: fornecedor.preco_compra,
              prazo_entrega_dias: fornecedor.prazo_entrega_dias
            }]
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.produtos.length - a.produtos.length);
  }, [produtos]);

  // Products without any supplier
  const produtosSemFornecedor = useMemo(() => {
    return produtos.filter(p => p.fornecedores.length === 0);
  }, [produtos]);

  const handleSelectFornecedor = (fornecedor: FornecedorAgrupado) => {
    setSelectedFornecedor(fornecedor);
    setShowNovaOC(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Consolidação por Fornecedor
            </DialogTitle>
            <DialogDescription>
              Selecione um fornecedor para gerar a ordem de compra. 
              Os produtos são agrupados por fornecedores que os atendem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {fornecedoresAgrupados.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum fornecedor disponível para os produtos selecionados
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fornecedoresAgrupados.map((fornecedor) => (
                  <Card 
                    key={fornecedor.parceiro_id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectFornecedor(fornecedor)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          {fornecedor.razao_social_nome}
                        </span>
                        <Badge variant="secondary">
                          {fornecedor.produtos.length} produto(s)
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {fornecedor.produtos.slice(0, 3).map(({ produto, preco_compra }) => (
                          <div 
                            key={produto.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Package className="w-3 h-3" />
                              {produto.nome}
                            </span>
                            {preco_compra > 0 && (
                              <span className="text-foreground">
                                R$ {preco_compra.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                        {fornecedor.produtos.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {fornecedor.produtos.length - 3} produto(s)
                          </p>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFornecedor(fornecedor);
                        }}
                      >
                        Gerar OC
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {produtosSemFornecedor.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Produtos sem Fornecedor Cadastrado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {produtosSemFornecedor.map((produto) => (
                      <p key={produto.id} className="text-sm text-muted-foreground">
                        • {produto.nome} ({produto.sku})
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-destructive mt-3">
                    Cadastre fornecedores para estes produtos antes de incluí-los em uma OC.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Voltar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedFornecedor && (
        <NovaOrdemCompraDialog
          open={showNovaOC}
          onOpenChange={setShowNovaOC}
          fornecedor={selectedFornecedor}
          integradoId={integradoId}
          onSuccess={() => {
            setShowNovaOC(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
