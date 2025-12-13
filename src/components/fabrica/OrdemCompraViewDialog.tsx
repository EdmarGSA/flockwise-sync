import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Truck, Calendar, CreditCard, Package, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdemCompraViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemId: string;
}

interface OrdemCompra {
  id: string;
  numero_oc: number;
  data_emissao: string;
  data_prevista_entrega: string | null;
  status: string;
  forma_pagamento: string | null;
  prazo_pagamento_dias: number | null;
  data_vencimento: string | null;
  valor_total: number;
  valor_frete: number | null;
  desconto: number | null;
  observacoes: string | null;
  parceiros: {
    razao_social_nome: string;
    cpf_cnpj: string;
  };
  itens: {
    id: string;
    quantidade: number;
    unidade_medida: string;
    unidade_compra: string | null;
    fator_conversao: number | null;
    preco_unitario: number;
    preco_total: number;
    quantidade_recebida: number | null;
    produtos: {
      nome: string;
      sku: string;
      unidade_medida: string;
    };
  }[];
}

export default function OrdemCompraViewDialog({
  open,
  onOpenChange,
  ordemId
}: OrdemCompraViewDialogProps) {
  const [ordem, setOrdem] = useState<OrdemCompra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && ordemId) {
      fetchOrdem();
    }
  }, [open, ordemId]);

  const fetchOrdem = async () => {
    setLoading(true);
    try {
      const { data: ordemData, error: ordemError } = await supabase
        .from('ordens_compra')
        .select(`
          id,
          numero_oc,
          data_emissao,
          data_prevista_entrega,
          status,
          forma_pagamento,
          prazo_pagamento_dias,
          data_vencimento,
          valor_total,
          valor_frete,
          desconto,
          observacoes,
          parceiros!inner(razao_social_nome, cpf_cnpj)
        `)
        .eq('id', ordemId)
        .single();

      if (ordemError) throw ordemError;

      const { data: itensData, error: itensError } = await supabase
        .from('ordens_compra_itens')
        .select(`
          id,
          quantidade,
          unidade_medida,
          unidade_compra,
          fator_conversao,
          preco_unitario,
          preco_total,
          quantidade_recebida,
          produtos!inner(nome, sku, unidade_medida)
        `)
        .eq('ordem_compra_id', ordemId);

      if (itensError) throw itensError;

      setOrdem({
        ...ordemData,
        itens: itensData || []
      } as OrdemCompra);
    } catch (error) {
      console.error('Erro ao buscar ordem:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      pendente: { label: 'Pendente', variant: 'outline' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      parcial_recebida: { label: 'Parcial', variant: 'outline' },
      recebida: { label: 'Recebida', variant: 'default' },
      cancelada: { label: 'Cancelada', variant: 'destructive' }
    };
    const { label, variant } = config[status] || { label: status, variant: 'secondary' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const subtotal = ordem?.itens.reduce((sum, item) => sum + item.preco_total, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : !ordem ? (
          <div className="py-8 text-center text-muted-foreground">Ordem não encontrada</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Ordem de Compra #{ordem.numero_oc}
              </DialogTitle>
              <DialogDescription>
                Detalhes da ordem de compra
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Truck className="w-4 h-4" />
                    Fornecedor
                  </div>
                  <p className="font-medium">{ordem.parceiros.razao_social_nome}</p>
                  <p className="text-xs text-muted-foreground">{ordem.parceiros.cpf_cnpj}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Data Emissão
                  </div>
                  <p className="font-medium">
                    {format(new Date(ordem.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <CreditCard className="w-4 h-4" />
                    Vencimento
                  </div>
                  <p className="font-medium">
                    {ordem.data_vencimento 
                      ? format(new Date(ordem.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">{ordem.forma_pagamento}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-muted-foreground text-sm mb-1">Status</div>
                  {getStatusBadge(ordem.status)}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens ({ordem.itens.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qtd. Compra</TableHead>
                        <TableHead className="text-right">Qtd. Estoque</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordem.itens.map((item) => {
                        const unidadeCompra = item.unidade_compra || item.unidade_medida;
                        const fatorConversao = item.fator_conversao || 1;
                        const qtdEstoque = item.quantidade * fatorConversao;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.produtos.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{item.produtos.sku}</TableCell>
                            <TableCell className="text-right">
                              {item.quantidade} {unidadeCompra}
                            </TableCell>
                            <TableCell className="text-right">
                              {fatorConversao > 1 ? (
                                <div className="flex items-center justify-end gap-1">
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-green-600">{qtdEstoque}</span>
                                  <span className="text-muted-foreground">{item.produtos.unidade_medida}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.preco_unitario.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {item.preco_total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete:</span>
                    <span>R$ {(ordem.valor_frete || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span>- R$ {(ordem.desconto || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>Total:</span>
                    <span className="text-primary">R$ {ordem.valor_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {ordem.observacoes && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{ordem.observacoes}</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
