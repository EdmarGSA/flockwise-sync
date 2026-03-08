import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, CheckCircle, Truck, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { PedidoFornecedor } from '@/hooks/useFornecedorData';
import { supabase } from '@/integrations/supabase/client';

interface FornecedorPedidosTabProps {
  pedidos: PedidoFornecedor[];
  onConfirmar: (pedidoId: string) => Promise<{ error: any }>;
  onEnviar: (pedidoId: string, nfNumero: string, observacoes?: string) => Promise<{ error: any }>;
}

interface OrdemItem {
  id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  unidade: string;
}

const statusFornecedorConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente_confirmacao: { label: 'Aguardando Confirmação', variant: 'destructive' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  enviado: { label: 'Enviado', variant: 'secondary' },
};

export const FornecedorPedidosTab = ({ pedidos, onConfirmar, onEnviar }: FornecedorPedidosTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [envioDialogOpen, setEnvioDialogOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoFornecedor | null>(null);
  const [pedidoItens, setPedidoItens] = useState<OrdemItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [nfNumero, setNfNumero] = useState('');
  const [observacoes, setObservacoes] = useState('');
  

  // Aplicar filtros
  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch = 
      pedido.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.integrado_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' || pedido.status_fornecedor === filterStatus;

    return matchSearch && matchStatus;
  });

  const fetchPedidoItens = async (pedidoId: string) => {
    setLoadingItens(true);
    const { data } = await supabase
      .from('ordens_compra_itens')
      .select(`
        id,
        quantidade,
        preco_unitario,
        produtos:produto_id (nome, unidade)
      `)
      .eq('ordem_compra_id', pedidoId);

    if (data) {
      setPedidoItens(data.map(item => ({
        id: item.id,
        produto_nome: (item.produtos as any)?.nome || 'Produto',
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        unidade: (item.produtos as any)?.unidade || 'un',
      })));
    }
    setLoadingItens(false);
  };

  const handleViewPedido = async (pedido: PedidoFornecedor) => {
    setSelectedPedido(pedido);
    await fetchPedidoItens(pedido.id);
    setViewDialogOpen(true);
  };

  const handleConfirmar = async (pedidoId: string) => {
    setIsUpdating(pedidoId);
    const { error } = await onConfirmar(pedidoId);
    setIsUpdating(null);

    if (error) {
      toast({
        title: 'Erro ao confirmar pedido',
        description: 'Não foi possível confirmar o pedido.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Pedido confirmado',
        description: 'O cliente foi notificado da confirmação.',
      });
    }
  };

  const handleOpenEnvioDialog = (pedido: PedidoFornecedor) => {
    setSelectedPedido(pedido);
    setNfNumero('');
    setObservacoes('');
    setEnvioDialogOpen(true);
  };

  const handleEnviar = async () => {
    if (!selectedPedido || !nfNumero.trim()) {
      toast({
        title: 'Número da NF obrigatório',
        description: 'Informe o número da nota fiscal para registrar o envio.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(selectedPedido.id);
    const { error } = await onEnviar(selectedPedido.id, nfNumero.trim(), observacoes.trim() || undefined);
    setIsUpdating(null);
    setEnvioDialogOpen(false);

    if (error) {
      toast({
        title: 'Erro ao registrar envio',
        description: 'Não foi possível registrar o envio.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Envio registrado',
        description: `Pedido enviado com NF ${nfNumero}. O cliente foi notificado.`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusFornecedorConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calcular totais
  const totalPedidos = pedidosFiltrados.length;
  const totalValor = pedidosFiltrados.reduce((sum, p) => sum + p.valor_total, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ordens de Compra Recebidas</CardTitle>
          <CardDescription>
            Ordens de compra aprovadas pelos seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(statusFornecedorConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrega Prev.</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma ordem de compra encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidosFiltrados.map(pedido => (
                    <TableRow key={pedido.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">OC-{pedido.numero_pedido}</p>
                          <p className="text-xs text-muted-foreground">
                            {pedido.itens_count} {pedido.itens_count === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{pedido.integrado_nome}</TableCell>
                      <TableCell>
                        {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {pedido.data_entrega_prevista 
                          ? format(new Date(pedido.data_entrega_prevista), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(pedido.status_fornecedor)}
                        {pedido.fornecedor_nf_numero && (
                          <p className="text-xs text-muted-foreground mt-1">
                            NF: {pedido.fornecedor_nf_numero}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPedido(pedido)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {pedido.status_fornecedor === 'pendente_confirmacao' && (
                            <Button
                              size="sm"
                              onClick={() => handleConfirmar(pedido.id)}
                              disabled={isUpdating === pedido.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          
                          {pedido.status_fornecedor === 'confirmado' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenEnvioDialog(pedido)}
                              disabled={isUpdating === pedido.id}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumo */}
          <div className="flex justify-between text-sm pt-2">
            <span className="text-muted-foreground">
              {totalPedidos} ordem{totalPedidos !== 1 ? 's' : ''} de compra
            </span>
            <span className="font-medium">
              Total: R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Visualizar Pedido */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem de Compra</DialogTitle>
            <DialogDescription>
              {selectedPedido && `OC-${selectedPedido.numero_pedido} • ${selectedPedido.integrado_nome}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPedido && (
            <div className="space-y-4">
              {/* Informações gerais */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">
                    {format(new Date(selectedPedido.data_pedido), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entrega Prevista</p>
                  <p className="font-medium">
                    {selectedPedido.data_entrega_prevista 
                      ? format(new Date(selectedPedido.data_entrega_prevista), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : 'Não informada'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPedido.status_fornecedor)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-lg">
                    R$ {selectedPedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Histórico</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Pedido aprovado pelo cliente em {format(new Date(selectedPedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  {selectedPedido.fornecedor_confirmado_em && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirmado em {format(new Date(selectedPedido.fornecedor_confirmado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                  )}
                  {selectedPedido.fornecedor_enviado_em && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Truck className="h-4 w-4" />
                      <span>Enviado em {format(new Date(selectedPedido.fornecedor_enviado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - NF: {selectedPedido.fornecedor_nf_numero}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Itens do Pedido</p>
                {loadingItens ? (
                  <p className="text-muted-foreground">Carregando itens...</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pedidoItens.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell className="text-right">
                              {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {(item.quantidade * item.preco_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
            {selectedPedido?.status_fornecedor === 'pendente_confirmacao' && (
              <Button onClick={() => {
                handleConfirmar(selectedPedido.id);
                setViewDialogOpen(false);
              }}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirmar Pedido
              </Button>
            )}
            {selectedPedido?.status_fornecedor === 'confirmado' && (
              <Button onClick={() => {
                setViewDialogOpen(false);
                handleOpenEnvioDialog(selectedPedido);
              }}>
                <Truck className="h-4 w-4 mr-1" />
                Registrar Envio
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Envio */}
      <Dialog open={envioDialogOpen} onOpenChange={setEnvioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Envio</DialogTitle>
            <DialogDescription>
              {selectedPedido && `OC-${selectedPedido.numero_pedido} • ${selectedPedido.integrado_nome}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nf-numero">Número da Nota Fiscal *</Label>
              <Input
                id="nf-numero"
                placeholder="Ex: 12345"
                value={nfNumero}
                onChange={(e) => setNfNumero(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Input
                id="observacoes"
                placeholder="Ex: Previsão de entrega em 2 dias"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviar}
              disabled={!nfNumero.trim() || isUpdating === selectedPedido?.id}
            >
              <Truck className="h-4 w-4 mr-1" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
