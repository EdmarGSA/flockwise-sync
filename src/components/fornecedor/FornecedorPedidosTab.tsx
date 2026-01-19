import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, CheckCircle, Truck, Package, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { PedidoFornecedor } from '@/hooks/useFornecedorData';

interface FornecedorPedidosTabProps {
  pedidos: PedidoFornecedor[];
  onUpdateStatus: (pedidoId: string, novoStatus: string) => Promise<{ error: any }>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'destructive' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  em_separacao: { label: 'Em Separação', variant: 'secondary' },
  faturado: { label: 'Faturado', variant: 'outline' },
  enviado: { label: 'Enviado', variant: 'secondary' },
  entregue: { label: 'Entregue', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export const FornecedorPedidosTab = ({ pedidos, onUpdateStatus }: FornecedorPedidosTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  // Aplicar filtros
  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch = 
      pedido.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.integrado_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' || pedido.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const handleUpdateStatus = async (pedidoId: string, novoStatus: string) => {
    setIsUpdating(pedidoId);
    const { error } = await onUpdateStatus(pedidoId, novoStatus);
    setIsUpdating(null);

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do pedido.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status atualizado',
        description: `Pedido atualizado para ${statusConfig[novoStatus]?.label || novoStatus}`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getNextStatuses = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      pendente: ['confirmado', 'cancelado'],
      confirmado: ['em_separacao', 'cancelado'],
      em_separacao: ['faturado', 'cancelado'],
      faturado: ['enviado'],
      enviado: ['entregue'],
      entregue: [],
      cancelado: [],
    };
    return transitions[currentStatus] || [];
  };

  // Calcular totais
  const totalPedidos = pedidosFiltrados.length;
  const totalValor = pedidosFiltrados.reduce((sum, p) => sum + p.valor_total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pedidos Recebidos</CardTitle>
        <CardDescription>
          Gerencie os pedidos enviados pelos seus clientes
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
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
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Entrega Prev.</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                pedidosFiltrados.map(pedido => (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pedido.numero_pedido}</p>
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
                      {getStatusBadge(pedido.status)}
                    </TableCell>
                    <TableCell>
                      {getNextStatuses(pedido.status).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              disabled={isUpdating === pedido.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getNextStatuses(pedido.status).map(status => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => handleUpdateStatus(pedido.id, status)}
                              >
                                {status === 'confirmado' && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
                                {status === 'em_separacao' && <Package className="h-4 w-4 mr-2 text-blue-600" />}
                                {status === 'faturado' && <Package className="h-4 w-4 mr-2 text-purple-600" />}
                                {status === 'enviado' && <Truck className="h-4 w-4 mr-2 text-orange-600" />}
                                {status === 'entregue' && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
                                {status === 'cancelado' && <XCircle className="h-4 w-4 mr-2 text-destructive" />}
                                Marcar como {statusConfig[status]?.label || status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
            {totalPedidos} pedido{totalPedidos !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">
            Total: R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
