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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Search, MoreVertical, Check, Truck, X, Eye, Package } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrdemCompraViewDialog from './OrdemCompraViewDialog';

interface OrdemCompra {
  id: string;
  numero_oc: number;
  parceiro_id: string;
  data_emissao: string;
  data_prevista_entrega: string | null;
  status: string;
  valor_total: number;
  parceiros: {
    razao_social_nome: string;
  };
}

interface OrdensCompraTableProps {
  integradoId: string;
  onRefresh: () => void;
}

export default function OrdensCompraTable({ integradoId, onRefresh }: OrdensCompraTableProps) {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrdem, setSelectedOrdem] = useState<string | null>(null);

  useEffect(() => {
    fetchOrdens();
  }, [integradoId]);

  const fetchOrdens = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ordens_compra')
        .select(`
          id,
          numero_oc,
          parceiro_id,
          data_emissao,
          data_prevista_entrega,
          status,
          valor_total,
          parceiros!inner(razao_social_nome)
        `)
        .eq('integrado_id', integradoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
      toast.error('Erro ao carregar ordens de compra');
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

  const handleAprovar = async (ordemId: string) => {
    try {
      // Get order details
      const { data: ordem, error: getError } = await supabase
        .from('ordens_compra')
        .select('valor_total, data_vencimento, parceiro_id')
        .eq('id', ordemId)
        .single();

      if (getError) throw getError;

      // Update order status
      const { error: updateError } = await supabase
        .from('ordens_compra')
        .update({ 
          status: 'aprovada',
          aprovado_por: integradoId,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', ordemId);

      if (updateError) throw updateError;

      // Create accounts payable entry
      const { error: contaError } = await supabase
        .from('contas_pagar')
        .insert({
          integrado_id: integradoId,
          ordem_compra_id: ordemId,
          parceiro_id: ordem.parceiro_id,
          descricao: `OC #${ordens.find(o => o.id === ordemId)?.numero_oc}`,
          valor: ordem.valor_total,
          data_vencimento: ordem.data_vencimento,
          status: 'previsto',
          categoria: 'compras'
        });

      if (contaError) throw contaError;

      toast.success('Ordem aprovada e lançada no contas a pagar');
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao aprovar ordem:', error);
      toast.error('Erro ao aprovar ordem');
    }
  };

  const handleCancelar = async (ordemId: string) => {
    try {
      const { error } = await supabase
        .from('ordens_compra')
        .update({ status: 'cancelada' })
        .eq('id', ordemId);

      if (error) throw error;

      // Cancel related accounts payable
      await supabase
        .from('contas_pagar')
        .update({ status: 'cancelado' })
        .eq('ordem_compra_id', ordemId);

      toast.success('Ordem cancelada');
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao cancelar ordem:', error);
      toast.error('Erro ao cancelar ordem');
    }
  };

  const handleReceber = async (ordemId: string) => {
    try {
      // Get order items
      const { data: itens, error: itensError } = await supabase
        .from('ordens_compra_itens')
        .select('produto_id, quantidade, preco_unitario')
        .eq('ordem_compra_id', ordemId);

      if (itensError) throw itensError;

      // Update order status
      const { error: updateError } = await supabase
        .from('ordens_compra')
        .update({ status: 'recebida' })
        .eq('id', ordemId);

      if (updateError) throw updateError;

      // Update accounts payable status
      await supabase
        .from('contas_pagar')
        .update({ status: 'pendente' })
        .eq('ordem_compra_id', ordemId)
        .eq('status', 'previsto');

      // Add stock for each item via kardex
      for (const item of itens || []) {
        // Get current stock
        const { data: produto, error: prodError } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.produto_id)
          .single();

        if (prodError) continue;

        const saldoAnterior = produto.estoque_atual;
        const novoSaldo = saldoAnterior + item.quantidade;

        // Create kardex entry
        await supabase.from('kardex').insert({
          integrado_id: integradoId,
          produto_id: item.produto_id,
          tipo_movimento: 'entrada',
          quantidade: item.quantidade,
          saldo_anterior: saldoAnterior,
          saldo_atual: novoSaldo,
          custo_unitario: item.preco_unitario,
          documento_ref: `OC-${ordens.find(o => o.id === ordemId)?.numero_oc}`,
          criado_por: integradoId
        });

        // Update product stock
        await supabase
          .from('produtos')
          .update({ estoque_atual: novoSaldo })
          .eq('id', item.produto_id);
      }

      toast.success('Mercadoria recebida e estoque atualizado');
      fetchOrdens();
      onRefresh();
    } catch (error) {
      console.error('Erro ao registrar recebimento:', error);
      toast.error('Erro ao registrar recebimento');
    }
  };

  const filteredOrdens = ordens.filter(ordem => {
    const matchesSearch = ordem.parceiros.razao_social_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ordem.numero_oc.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || ordem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Ordens de Compra
        </CardTitle>
        <CardDescription>
          Gerencie suas ordens de compra
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por fornecedor ou número..."
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
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="parcial_recebida">Parcial</SelectItem>
              <SelectItem value="recebida">Recebida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : filteredOrdens.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma ordem de compra encontrada</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OC</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Prev. Entrega</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdens.map((ordem) => (
                  <TableRow key={ordem.id}>
                    <TableCell className="font-medium">#{ordem.numero_oc}</TableCell>
                    <TableCell>{ordem.parceiros.razao_social_nome}</TableCell>
                    <TableCell>
                      {format(new Date(ordem.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {ordem.data_prevista_entrega 
                        ? format(new Date(ordem.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {ordem.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(ordem.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedOrdem(ordem.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {ordem.status === 'pendente' && (
                            <DropdownMenuItem onClick={() => handleAprovar(ordem.id)}>
                              <Check className="w-4 h-4 mr-2" />
                              Aprovar
                            </DropdownMenuItem>
                          )}
                          {ordem.status === 'aprovada' && (
                            <DropdownMenuItem onClick={() => handleReceber(ordem.id)}>
                              <Package className="w-4 h-4 mr-2" />
                              Registrar Recebimento
                            </DropdownMenuItem>
                          )}
                          {['rascunho', 'pendente'].includes(ordem.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleCancelar(ordem.id)}
                              className="text-destructive"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {selectedOrdem && (
        <OrdemCompraViewDialog
          open={!!selectedOrdem}
          onOpenChange={(open) => !open && setSelectedOrdem(null)}
          ordemId={selectedOrdem}
        />
      )}
    </Card>
  );
}
