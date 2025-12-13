import { useState, useEffect } from 'react';
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
  TableRow,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Search, Check, Calendar, AlertTriangle } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  categoria: string | null;
  parceiros: {
    razao_social_nome: string;
  } | null;
}

interface ContasPagarTableProps {
  integradoId: string;
  onRefresh: () => void;
}

export default function ContasPagarTable({ integradoId, onRefresh }: ContasPagarTableProps) {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPagamento, setShowPagamento] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchContas();
  }, [integradoId]);

  const fetchContas = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          id,
          descricao,
          valor,
          data_vencimento,
          data_pagamento,
          status,
          categoria,
          parceiros(razao_social_nome)
        `)
        .eq('integrado_id', integradoId)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setContas(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const isVencida = isBefore(new Date(dataVencimento), new Date()) && status !== 'pago' && status !== 'cancelado';
    const venceEm7Dias = isAfter(new Date(dataVencimento), new Date()) && 
                          isBefore(new Date(dataVencimento), addDays(new Date(), 7)) &&
                          status !== 'pago' && status !== 'cancelado';

    if (isVencida) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Vencida
      </Badge>;
    }

    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      previsto: { label: 'Previsto', variant: 'secondary' },
      pendente: { label: venceEm7Dias ? 'Vence em breve' : 'Pendente', variant: venceEm7Dias ? 'outline' : 'secondary' },
      pago: { label: 'Pago', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' }
    };
    const { label, variant } = config[status] || { label: status, variant: 'secondary' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handlePagar = async () => {
    if (!showPagamento) return;

    try {
      const { error } = await supabase
        .from('contas_pagar')
        .update({ 
          status: 'pago',
          data_pagamento: dataPagamento
        })
        .eq('id', showPagamento);

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso');
      setShowPagamento(null);
      fetchContas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.parceiros?.razao_social_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conta.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPendente = filteredContas
    .filter(c => ['previsto', 'pendente'].includes(c.status))
    .reduce((sum, c) => sum + c.valor, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Contas a Pagar
        </CardTitle>
        <CardDescription>
          Gerencie suas contas a pagar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between p-4 mb-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-2xl font-bold text-primary">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Contas</p>
            <p className="text-xl font-bold">
              {filteredContas.filter(c => ['previsto', 'pendente'].includes(c.status)).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="previsto">Previsto</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : filteredContas.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {conta.parceiros?.razao_social_nome || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(conta.status, conta.data_vencimento)}</TableCell>
                    <TableCell>
                      {['previsto', 'pendente'].includes(conta.status) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setShowPagamento(conta.id);
                            setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                      {conta.status === 'pago' && conta.data_pagamento && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conta.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Payment Dialog */}
      <Dialog open={!!showPagamento} onOpenChange={(open) => !open && setShowPagamento(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Informe a data do pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamento(null)}>
              Cancelar
            </Button>
            <Button onClick={handlePagar}>
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
