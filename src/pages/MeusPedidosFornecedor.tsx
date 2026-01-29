import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  RefreshCw, 
  Package,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PedidoDetalheDialog } from '@/components/fornecedor/vendas/PedidoDetalheDialog';
import logoGSA from "@/assets/logo-gsa.png";

interface PedidoCatalogo {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  data_pedido: string;
  valor_total: number;
  status: string;
  itens_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  separado: { label: 'Separado', variant: 'default' },
  faturado: { label: 'Faturado', variant: 'default' },
  entregue: { label: 'Entregue', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

const MeusPedidosFornecedor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoCatalogo[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('all');
  const [pedidoDetalheId, setPedidoDetalheId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPedidos = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Buscar fornecedor_global_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('fornecedor_global_id')
        .eq('id', user.id)
        .single();

      if (!profile?.fornecedor_global_id) return;

      // Buscar pedidos
      let query = supabase
        .from('pedidos_catalogo_fornecedor')
        .select(`
          id,
          numero_pedido,
          cliente_fornecedor_id,
          data_pedido,
          valor_total,
          status
        `)
        .eq('fornecedor_global_id', profile.fornecedor_global_id)
        .order('data_pedido', { ascending: false });

      if (statusFiltro !== 'all') {
        query = query.eq('status', statusFiltro);
      }

      const { data: pedidosData } = await query;

      if (!pedidosData || pedidosData.length === 0) {
        setPedidos([]);
        return;
      }

      // Buscar nomes dos clientes
      const clienteIds = [...new Set(pedidosData.map(p => p.cliente_fornecedor_id))];
      const { data: clientes } = await supabase
        .from('clientes_fornecedor')
        .select('id, razao_social_nome')
        .in('id', clienteIds);

      const clienteMap = new Map(clientes?.map(c => [c.id, c.razao_social_nome]) || []);

      // Buscar contagem de itens
      const { data: itens } = await supabase
        .from('pedidos_catalogo_fornecedor_itens')
        .select('pedido_id')
        .in('pedido_id', pedidosData.map(p => p.id));

      const itensCount = new Map<string, number>();
      itens?.forEach(item => {
        itensCount.set(item.pedido_id, (itensCount.get(item.pedido_id) || 0) + 1);
      });

      setPedidos(pedidosData.map(p => ({
        id: p.id,
        numero_pedido: p.numero_pedido,
        cliente_nome: clienteMap.get(p.cliente_fornecedor_id) || 'Cliente',
        data_pedido: p.data_pedido,
        valor_total: p.valor_total || 0,
        status: p.status,
        itens_count: itensCount.get(p.id) || 0,
      })));
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFiltro]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPedidos();
    setIsRefreshing(false);
  };

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      p.numero_pedido.toLowerCase().includes(termo) ||
      p.cliente_nome.toLowerCase().includes(termo)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/portal-fornecedor')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <img src={logoGSA} alt="Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Meus Pedidos</h1>
                <p className="text-xs text-muted-foreground">Acompanhe seus pedidos de venda</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pedidos
            </CardTitle>
            <CardDescription>
              Lista de todos os pedidos criados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {pedidosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                <p className="text-sm">Crie pedidos na aba Vendas do portal</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosFiltrados.map(pedido => {
                      const statusConfig = STATUS_CONFIG[pedido.status] || STATUS_CONFIG.pendente;
                      
                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium font-mono">
                            {pedido.numero_pedido}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{pedido.cliente_nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {pedido.itens_count} itens
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(pedido.data_pedido), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPedidoDetalheId(pedido.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
      </main>

      {/* Dialog de Detalhes */}
      <PedidoDetalheDialog
        open={!!pedidoDetalheId}
        onClose={() => setPedidoDetalheId(null)}
        pedidoId={pedidoDetalheId}
      />
    </div>
  );
};

export default MeusPedidosFornecedor;
