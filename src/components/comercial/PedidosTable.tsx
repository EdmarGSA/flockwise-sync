import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Search, Package, CheckCircle, Truck, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import NovoPedidoDialog from './NovoPedidoDialog';
import PedidoViewDialog from './PedidoViewDialog';
import SeparacaoDialog from './SeparacaoDialog';
import FaturamentoDialog from './FaturamentoDialog';

interface PedidosTableProps {
  integradoId: string;
}

type StatusPedido = 'rascunho' | 'pendente_aprovacao' | 'aprovado' | 'em_separacao' | 'faturado' | 'cancelado';

export default function PedidosTable({ integradoId }: PedidosTableProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSeparacaoDialog, setShowSeparacaoDialog] = useState(false);
  const [showFaturamentoDialog, setShowFaturamentoDialog] = useState(false);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          cliente:parceiros!pedidos_cliente_id_fkey(razao_social_nome, nome_fantasia),
          vendedor:profiles!pedidos_vendedor_id_fkey(full_name)
        `)
        .eq('integrado_id', integradoId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [integradoId, statusFilter]);

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

  const handleAprovar = async (pedido: any) => {
    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: 'aprovado',
          aprovado_por: integradoId,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', pedido.id);

      if (updateError) throw updateError;

      // Create accounts receivable entry as 'previsao'
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + (pedido.prazo_pagamento_dias || 30));

      const { error: crError } = await supabase
        .from('contas_receber')
        .insert({
          integrado_id: integradoId,
          pedido_id: pedido.id,
          cliente_id: pedido.cliente_id,
          descricao: `Pedido #${pedido.numero_pedido}`,
          valor: pedido.valor_total,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'previsao',
          forma_pagamento: pedido.forma_pagamento
        });

      if (crError) throw crError;

      toast.success('Pedido aprovado! Conta a receber criada como previsão.');
      fetchPedidos();
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Erro ao aprovar pedido');
    }
  };

  const handleCancelar = async (pedido: any) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', pedido.id);

      if (error) throw error;

      // Also cancel related accounts receivable
      await supabase
        .from('contas_receber')
        .update({ status: 'cancelado' })
        .eq('pedido_id', pedido.id);

      toast.success('Pedido cancelado');
      fetchPedidos();
    } catch (error) {
      console.error('Error canceling order:', error);
      toast.error('Erro ao cancelar pedido');
    }
  };

  const filteredPedidos = pedidos.filter(pedido => {
    if (!searchTerm) return true;
    const clienteName = pedido.cliente?.razao_social_nome || pedido.cliente?.nome_fantasia || '';
    return (
      pedido.numero_pedido?.toString().includes(searchTerm) ||
      clienteName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Pedidos de Venda
        </CardTitle>
        <Button onClick={() => setShowNovoPedido(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="em_separacao">Em Separação</SelectItem>
              <SelectItem value="faturado">Faturado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredPedidos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">#{pedido.numero_pedido}</TableCell>
                    <TableCell>
                      {pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPedido(pedido);
                            setShowViewDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {pedido.status === 'pendente_aprovacao' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAprovar(pedido)}
                              title="Aprovar"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelar(pedido)}
                              title="Cancelar"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}

                        {pedido.status === 'aprovado' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPedido(pedido);
                              setShowSeparacaoDialog(true);
                            }}
                            title="Separar"
                          >
                            <Package className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}

                        {pedido.status === 'em_separacao' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPedido(pedido);
                              setShowFaturamentoDialog(true);
                            }}
                            title="Faturar"
                          >
                            <Truck className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <NovoPedidoDialog
        open={showNovoPedido}
        onOpenChange={setShowNovoPedido}
        integradoId={integradoId}
        onSuccess={fetchPedidos}
      />

      {selectedPedido && (
        <>
          <PedidoViewDialog
            open={showViewDialog}
            onOpenChange={setShowViewDialog}
            pedido={selectedPedido}
          />
          <SeparacaoDialog
            open={showSeparacaoDialog}
            onOpenChange={setShowSeparacaoDialog}
            pedido={selectedPedido}
            integradoId={integradoId}
            onSuccess={fetchPedidos}
          />
          <FaturamentoDialog
            open={showFaturamentoDialog}
            onOpenChange={setShowFaturamentoDialog}
            pedido={selectedPedido}
            integradoId={integradoId}
            onSuccess={fetchPedidos}
          />
        </>
      )}
    </Card>
  );
}
