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
import { useIsMobile } from '@/hooks/use-mobile';
import NovoPedidoStepper from './NovoPedidoStepper';
import PedidoViewDialog from './PedidoViewDialog';
import SeparacaoDialog from './SeparacaoDialog';
import FaturamentoDialog from './FaturamentoDialog';
import PedidosKPICards from './PedidosKPICards';

interface PedidosTableProps {
  integradoId: string;
}

type StatusPedido = 'rascunho' | 'pendente_aprovacao' | 'aprovado' | 'em_separacao' | 'faturado' | 'cancelado';

const STATUS_CONFIG: Record<StatusPedido, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-muted' },
  pendente_aprovacao: { label: 'Pendente', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
  em_separacao: { label: 'Separação', className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  faturado: { label: 'Faturado', className: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
};

export default function PedidosTable({ integradoId }: PedidosTableProps) {
  const isMobile = useIsMobile();
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
          vendedor:profiles!pedidos_vendedor_id_fkey(full_name),
          pedido_itens(id)
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
    const config = STATUS_CONFIG[status] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const handleAprovar = async (pedido: any) => {
    try {
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ status: 'aprovado', aprovado_por: integradoId, data_aprovacao: new Date().toISOString() })
        .eq('id', pedido.id);
      if (updateError) throw updateError;

      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + (pedido.prazo_pagamento_dias || 30));
      const { error: crError } = await supabase.from('contas_receber').insert({
        integrado_id: integradoId, pedido_id: pedido.id, cliente_id: pedido.cliente_id,
        descricao: `Pedido #${pedido.numero_pedido}`, valor: pedido.valor_total,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        status: 'previsao', forma_pagamento: pedido.forma_pagamento
      });
      if (crError) throw crError;

      toast.success('Pedido aprovado! Conta a receber criada.');
      fetchPedidos();
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Erro ao aprovar pedido');
    }
  };

  const handleCancelar = async (pedido: any) => {
    try {
      const { error } = await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id);
      if (error) throw error;
      await supabase.from('contas_receber').update({ status: 'cancelado' }).eq('pedido_id', pedido.id);
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

  const openPedidoView = (pedido: any) => {
    setSelectedPedido(pedido);
    setShowViewDialog(true);
  };

  // Mobile card renderer
  const renderMobileCard = (pedido: any) => {
    const qtdItens = pedido.pedido_itens?.length || 0;
    return (
      <Card key={pedido.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openPedidoView(pedido)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">#{pedido.numero_pedido}</span>
              {qtdItens > 0 && <Badge variant="secondary" className="text-xs">{qtdItens} itens</Badge>}
            </div>
            {getStatusBadge(pedido.status)}
          </div>
          <p className="text-sm font-medium truncate">{pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}</p>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-muted-foreground">{format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}</span>
            <span className="font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}</span>
          </div>
          {pedido.vendedor?.full_name && (
            <p className="text-xs text-muted-foreground mt-1">Vendedor: {pedido.vendedor.full_name}</p>
          )}
          <div className="flex justify-end gap-1 mt-3">
            {pedido.status === 'pendente_aprovacao' && (
              <>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAprovar(pedido); }}><CheckCircle className="w-4 h-4 text-green-500 mr-1" /> Aprovar</Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCancelar(pedido); }}><X className="w-4 h-4 text-destructive mr-1" /> Cancelar</Button>
              </>
            )}
            {pedido.status === 'aprovado' && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPedido(pedido); setShowSeparacaoDialog(true); }}>
                <Package className="w-4 h-4 text-blue-500 mr-1" /> Separar
              </Button>
            )}
            {pedido.status === 'em_separacao' && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPedido(pedido); setShowFaturamentoDialog(true); }}>
                <Truck className="w-4 h-4 text-primary mr-1" /> Faturar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PedidosKPICards integradoId={integradoId} />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-5 h-5" />
            Pedidos de Venda
          </CardTitle>
          <Button onClick={() => setShowNovoPedido(true)} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Novo Pedido
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nº ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="pendente_aprovacao">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="em_separacao">Separação</SelectItem>
                <SelectItem value="faturado">Faturado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredPedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredPedidos.map(renderMobileCard)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => {
                    const qtdItens = pedido.pedido_itens?.length || 0;
                    return (
                      <TableRow key={pedido.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openPedidoView(pedido)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            #{pedido.numero_pedido}
                            {qtdItens > 0 && <Badge variant="secondary" className="text-xs">{qtdItens}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{pedido.cliente?.nome_fantasia || pedido.cliente?.razao_social_nome || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{pedido.vendedor?.full_name || '-'}</TableCell>
                        <TableCell>{format(new Date(pedido.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}</TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openPedidoView(pedido)}><Eye className="w-4 h-4" /></Button>
                            {pedido.status === 'pendente_aprovacao' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleAprovar(pedido)} title="Aprovar"><CheckCircle className="w-4 h-4 text-green-500" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleCancelar(pedido)} title="Cancelar"><X className="w-4 h-4 text-destructive" /></Button>
                              </>
                            )}
                            {pedido.status === 'aprovado' && (
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedPedido(pedido); setShowSeparacaoDialog(true); }} title="Separar"><Package className="w-4 h-4 text-blue-500" /></Button>
                            )}
                            {pedido.status === 'em_separacao' && (
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedPedido(pedido); setShowFaturamentoDialog(true); }} title="Faturar"><Truck className="w-4 h-4 text-primary" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NovoPedidoStepper
        open={showNovoPedido}
        onOpenChange={setShowNovoPedido}
        integradoId={integradoId}
        onSuccess={fetchPedidos}
      />

      {selectedPedido && (
        <>
          <PedidoViewDialog open={showViewDialog} onOpenChange={setShowViewDialog} pedido={selectedPedido} />
          <SeparacaoDialog open={showSeparacaoDialog} onOpenChange={setShowSeparacaoDialog} pedido={selectedPedido} integradoId={integradoId} onSuccess={fetchPedidos} />
          <FaturamentoDialog open={showFaturamentoDialog} onOpenChange={setShowFaturamentoDialog} pedido={selectedPedido} integradoId={integradoId} onSuccess={fetchPedidos} />
        </>
      )}
    </div>
  );
}
