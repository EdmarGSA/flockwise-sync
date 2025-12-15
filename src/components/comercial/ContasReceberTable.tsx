import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DollarSign, Search, CheckCircle, Eye } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ContasReceberTableProps {
  integradoId: string;
}

type ContaReceberStatus = 'previsao' | 'pendente' | 'recebido' | 'parcial' | 'cancelado';

export default function ContasReceberTable({ integradoId }: ContasReceberTableProps) {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceberDialog, setShowReceberDialog] = useState(false);
  const [selectedConta, setSelectedConta] = useState<any>(null);
  const [recebimentoData, setRecebimentoData] = useState({
    data_recebimento: format(new Date(), 'yyyy-MM-dd'),
    valor_recebido: 0,
    juros: 0,
    multa: 0,
    desconto: 0
  });

  const fetchContas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contas_receber')
        .select(`
          *,
          cliente:parceiros!contas_receber_cliente_id_fkey(razao_social_nome, nome_fantasia),
          pedido:pedidos(numero_pedido)
        `)
        .eq('integrado_id', integradoId)
        .order('data_vencimento', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Error fetching contas:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();
  }, [integradoId, statusFilter]);

  const getStatusBadge = (status: ContaReceberStatus) => {
    const statusConfig: Record<ContaReceberStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      previsao: { label: 'Previsão', variant: 'secondary' },
      pendente: { label: 'Pendente', variant: 'outline' },
      recebido: { label: 'Recebido', variant: 'default' },
      parcial: { label: 'Parcial', variant: 'outline' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVencimentoStatus = (dataVencimento: string, status: ContaReceberStatus) => {
    if (status === 'recebido' || status === 'cancelado') return null;
    
    const dias = differenceInDays(new Date(dataVencimento), new Date());
    
    if (dias < 0) {
      return <Badge variant="destructive">Vencido há {Math.abs(dias)} dias</Badge>;
    } else if (dias <= 3) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Vence em {dias} dias</Badge>;
    }
    return null;
  };

  const handleOpenReceber = (conta: any) => {
    setSelectedConta(conta);
    setRecebimentoData({
      data_recebimento: format(new Date(), 'yyyy-MM-dd'),
      valor_recebido: conta.valor,
      juros: 0,
      multa: 0,
      desconto: 0
    });
    setShowReceberDialog(true);
  };

  const handleReceber = async () => {
    if (!selectedConta) return;

    try {
      const valorFinal = recebimentoData.valor_recebido + recebimentoData.juros + recebimentoData.multa - recebimentoData.desconto;
      const isParcial = valorFinal < selectedConta.valor;

      const { error } = await supabase
        .from('contas_receber')
        .update({
          status: isParcial ? 'parcial' : 'recebido',
          data_recebimento: recebimentoData.data_recebimento,
          valor_recebido: valorFinal,
          juros: recebimentoData.juros,
          multa: recebimentoData.multa,
          desconto: recebimentoData.desconto
        })
        .eq('id', selectedConta.id);

      if (error) throw error;

      toast.success(isParcial ? 'Recebimento parcial registrado!' : 'Recebimento total registrado!');
      setShowReceberDialog(false);
      fetchContas();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Erro ao registrar recebimento');
    }
  };

  const filteredContas = contas.filter(conta => {
    if (!searchTerm) return true;
    const clienteName = conta.cliente?.razao_social_nome || conta.cliente?.nome_fantasia || '';
    return (
      conta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clienteName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate summary
  const totalPrevisao = contas.filter(c => c.status === 'previsao').reduce((acc, c) => acc + c.valor, 0);
  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0);
  const totalRecebido = contas.filter(c => c.status === 'recebido').reduce((acc, c) => acc + (c.valor_recebido || c.valor), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Contas a Receber
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Previsão</p>
              <p className="text-xl font-bold text-muted-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrevisao)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-600">Pendente</p>
              <p className="text-xl font-bold text-amber-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-green-600">Recebido</p>
              <p className="text-xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecebido)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou cliente..."
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
              <SelectItem value="previsao">Previsão</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredContas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma conta a receber encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{conta.descricao}</p>
                        {conta.pedido && (
                          <p className="text-xs text-muted-foreground">
                            Pedido #{conta.pedido.numero_pedido}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {conta.cliente?.nome_fantasia || conta.cliente?.razao_social_nome || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                        {getVencimentoStatus(conta.data_vencimento, conta.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor)}
                      {conta.valor_recebido && conta.valor_recebido !== conta.valor && (
                        <p className="text-xs text-green-600">
                          Recebido: R$ {conta.valor_recebido.toFixed(2)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(conta.status)}</TableCell>
                    <TableCell className="text-right">
                      {(conta.status === 'pendente' || conta.status === 'parcial') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenReceber(conta)}
                          title="Registrar Recebimento"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Receber Dialog */}
      <Dialog open={showReceberDialog} onOpenChange={setShowReceberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          {selectedConta && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedConta.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  Valor Original: R$ {selectedConta.valor?.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Recebimento</Label>
                  <Input
                    type="date"
                    value={recebimentoData.data_recebimento}
                    onChange={(e) => setRecebimentoData({ ...recebimentoData, data_recebimento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Recebido</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recebimentoData.valor_recebido}
                    onChange={(e) => setRecebimentoData({ ...recebimentoData, valor_recebido: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Juros</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recebimentoData.juros}
                    onChange={(e) => setRecebimentoData({ ...recebimentoData, juros: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multa</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recebimentoData.multa}
                    onChange={(e) => setRecebimentoData({ ...recebimentoData, multa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recebimentoData.desconto}
                    onChange={(e) => setRecebimentoData({ ...recebimentoData, desconto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg text-right">
                <p className="text-sm text-muted-foreground">Valor Final</p>
                <p className="text-xl font-bold text-primary">
                  R$ {(recebimentoData.valor_recebido + recebimentoData.juros + recebimentoData.multa - recebimentoData.desconto).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceberDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceber}>
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
