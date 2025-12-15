import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Calendar, CreditCard, Truck, FileText } from 'lucide-react';

interface PedidoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
}

type StatusPedido = 'rascunho' | 'pendente_aprovacao' | 'aprovado' | 'em_separacao' | 'faturado' | 'cancelado';

export default function PedidoViewDialog({ open, onOpenChange, pedido }: PedidoViewDialogProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && pedido) {
      fetchItens();
    }
  }, [open, pedido]);

  const fetchItens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          produto:produtos(nome, unidade_medida)
        `)
        .eq('pedido_id', pedido.id)
        .order('created_at');

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: StatusPedido) => {
    const statusConfig: Record<StatusPedido, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'outline' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      em_separacao: { label: 'Em Separação', variant: 'default' },
      faturado: { label: 'Faturado', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      boleto: 'Boleto',
      pix: 'PIX',
      transferencia: 'Transferência',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      dinheiro: 'Dinheiro',
      cheque: 'Cheque'
    };
    return labels[forma] || forma;
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Pedido #{pedido.numero_pedido}
            <span className="ml-2">{getStatusBadge(pedido.status)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cliente</span>
                </div>
                <p className="font-medium">
                  {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Datas</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>Emissão: {format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  {pedido.data_entrega_prevista && (
                    <p>Entrega Prevista: {format(new Date(pedido.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pagamento</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>Forma: {pedido.forma_pagamento ? getFormaPagamentoLabel(pedido.forma_pagamento) : '-'}</p>
                  <p>Prazo: {pedido.prazo_pagamento_dias} dias</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Frete</span>
                </div>
                <p className="font-medium">
                  R$ {(pedido.valor_frete || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline / Status History */}
          {(pedido.data_aprovacao || pedido.data_faturamento) && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Histórico</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Criado em:</span>
                    <span>{format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {pedido.data_aprovacao && (
                    <div className="flex justify-between text-green-600">
                      <span>Aprovado em:</span>
                      <span>{format(new Date(pedido.data_aprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                  {pedido.data_faturamento && (
                    <div className="flex justify-between text-blue-600">
                      <span>Faturado em:</span>
                      <span>{format(new Date(pedido.data_faturamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                  {pedido.numero_nfe && (
                    <div className="flex justify-between">
                      <span>NF-e:</span>
                      <span className="font-mono">{pedido.numero_nfe}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Items */}
          <div>
            <h4 className="font-medium mb-3">Itens do Pedido</h4>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Carregando itens...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.produto?.nome || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.quantidade} {item.unidade_medida}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {item.preco_unitario?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.desconto_percentual > 0 ? `${item.desconto_percentual}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {item.valor_total?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <Card className="w-64">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {pedido.valor_subtotal?.toFixed(2)}</span>
                </div>
                {pedido.desconto > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Desconto</span>
                    <span>- R$ {pedido.desconto?.toFixed(2)}</span>
                  </div>
                )}
                {pedido.valor_frete > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span>+ R$ {pedido.valor_frete?.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {pedido.valor_total?.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Observations */}
          {pedido.observacoes && (
            <div>
              <h4 className="font-medium mb-2">Observações</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {pedido.observacoes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
