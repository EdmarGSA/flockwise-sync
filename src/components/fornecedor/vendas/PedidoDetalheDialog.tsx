import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  FileText,
  User,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface PedidoCatalogoFornecedor {
  id: string;
  numero_pedido: string;
  fornecedor_global_id: string;
  cliente_fornecedor_id: string;
  vendedor_fornecedor_id: string | null;
  data_pedido: string;
  valor_bruto: number;
  desconto_percentual: number;
  valor_desconto: number;
  valor_total: number;
  condicao_pagamento: string | null;
  data_entrega_prevista: string | null;
  data_entrega_real: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface ItemPedido {
  id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
}

interface PedidoDetalheDialogProps {
  open: boolean;
  onClose: () => void;
  pedidoId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'secondary' },
  pendente: { label: 'Pendente', color: 'default' },
  aprovado: { label: 'Aprovado', color: 'default' },
  separado: { label: 'Separado', color: 'default' },
  faturado: { label: 'Faturado', color: 'default' },
  entregue: { label: 'Entregue', color: 'default' },
  cancelado: { label: 'Cancelado', color: 'destructive' },
};

const TIMELINE_STEPS = ['pendente', 'aprovado', 'separado', 'faturado', 'entregue'];

export const PedidoDetalheDialog = ({
  open,
  onClose,
  pedidoId
}: PedidoDetalheDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<PedidoCatalogoFornecedor | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [cliente, setCliente] = useState<{ razao_social_nome: string; cpf_cnpj: string } | null>(null);
  const [vendedor, setVendedor] = useState<{ nome: string } | null>(null);

  useEffect(() => {
    if (!pedidoId || !open) return;

    const fetchPedido = async () => {
      setLoading(true);

      try {
        // Buscar pedido
        const { data: pedidoData } = await supabase
          .from('pedidos_catalogo_fornecedor')
          .select('*')
          .eq('id', pedidoId)
          .single();

        if (!pedidoData) return;

        setPedido(pedidoData as PedidoCatalogoFornecedor);

        // Buscar itens
        const { data: itensData } = await supabase
          .from('pedidos_catalogo_fornecedor_itens')
          .select(`
            id,
            quantidade,
            preco_unitario,
            valor_total,
            produto_catalogo_id
          `)
          .eq('pedido_id', pedidoId);

        if (itensData && itensData.length > 0) {
          const produtoIds = itensData.map(i => i.produto_catalogo_id);
          const { data: produtos } = await supabase
            .from('produtos_catalogo_fornecedor')
            .select('id, nome')
            .in('id', produtoIds);

          const produtoMap = new Map(produtos?.map(p => [p.id, p.nome]) || []);

          setItens(itensData.map(i => ({
            id: i.id,
            produto_nome: produtoMap.get(i.produto_catalogo_id) || 'Produto',
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            valor_total: i.valor_total,
          })));
        }

        // Buscar cliente
        const { data: clienteData } = await supabase
          .from('clientes_fornecedor')
          .select('razao_social_nome, cpf_cnpj')
          .eq('id', pedidoData.cliente_fornecedor_id)
          .single();

        setCliente(clienteData);

        // Buscar vendedor
        if (pedidoData.vendedor_fornecedor_id) {
          const { data: vendedorData } = await supabase
            .from('vendedores_fornecedor')
            .select('nome')
            .eq('id', pedidoData.vendedor_fornecedor_id)
            .single();

          setVendedor(vendedorData);
        }
      } catch (error) {
        console.error('Erro ao buscar pedido:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [pedidoId, open]);

  const getStatusIndex = (status: string) => {
    return TIMELINE_STEPS.indexOf(status);
  };

  const currentStatusIndex = pedido ? getStatusIndex(pedido.status) : -1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pedido {pedido?.numero_pedido || ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : pedido ? (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Info do Cliente */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                <p className="font-medium">{cliente?.razao_social_nome}</p>
                <p className="text-sm text-muted-foreground">{cliente?.cpf_cnpj}</p>
                {vendedor && (
                  <p className="text-xs text-muted-foreground">
                    Vendedor: {vendedor.nome}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-medium mb-4">Status do Pedido</h4>
                <div className="space-y-3">
                  {TIMELINE_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStatusIndex;
                    const isCurrent = idx === currentStatusIndex;
                    const config = STATUS_CONFIG[step];

                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 ${
                          isCompleted ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${isCurrent ? 'font-medium' : ''}`}>
                            {config.label}
                          </p>
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary">Atual</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data do Pedido</p>
                    <p className="text-sm">
                      {format(new Date(pedido.data_pedido), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {pedido.data_entrega_prevista && (
                  <div className="flex items-start gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Entrega Prevista</p>
                      <p className="text-sm">
                        {format(new Date(pedido.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Itens */}
              <div>
                <h4 className="text-sm font-medium mb-3">Itens do Pedido</h4>
                <div className="space-y-2">
                  {itens.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start py-2 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{item.quantidade}x {item.produto_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totais */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>R$ {pedido.valor_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {pedido.valor_desconto > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Desconto ({pedido.desconto_percentual}%):</span>
                    <span>- R$ {pedido.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total:</span>
                  <span>R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Observações */}
              {pedido.observacoes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Observações</h4>
                    <p className="text-sm text-muted-foreground">{pedido.observacoes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
