import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isPast, isToday } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, DollarSign, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface ContasPagarFinanceiroTabProps {
  userId: string;
}

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  conta_bancaria_id: string | null;
  parceiros: { razao_social_nome: string } | null;
  plano_contas: { nome: string } | null;
  centro_custos: { nome: string } | null;
}

const ContasPagarFinanceiroTab = ({ userId }: ContasPagarFinanceiroTabProps) => {
  const queryClient = useQueryClient();
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  const [valorPago, setValorPago] = useState("");
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: contas, isLoading } = useQuery({
    queryKey: ['contas-pagar-financeiro', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          parceiros:parceiro_id(razao_social_nome),
          plano_contas:plano_conta_id(nome),
          centro_custos:centro_custo_id(nome)
        `)
        .eq('integrado_id', userId)
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      return (data || []) as ContaPagar[];
    }
  });

  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('id, banco_nome, conta, agencia')
        .eq('integrado_id', userId)
        .eq('ativo', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (conta: ContaPagar) => {
    if (conta.status === 'pago') {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    const vencimento = new Date(conta.data_vencimento);
    if (isPast(vencimento) && !isToday(vencimento)) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge variant="secondary" className="bg-amber-500 text-white"><Clock className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
    }
    // Pendente = "A Pagar"
    return <Badge variant="outline"><DollarSign className="h-3 w-3 mr-1" />A Pagar</Badge>;
  };

  const handleRegistrarPagamento = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setValorPago(conta.valor.toString());
    setDataPagamento(format(new Date(), "yyyy-MM-dd"));
    setContaBancariaId(conta.conta_bancaria_id || "");
    setShowPagamentoDialog(true);
  };

  const handleConfirmarPagamento = async () => {
    if (!selectedConta) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contas_pagar')
        .update({
          status: 'pago',
          valor_pago: parseFloat(valorPago),
          data_pagamento: dataPagamento,
          conta_bancaria_id: contaBancariaId || null
        })
        .eq('id', selectedConta.id);

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');
      setShowPagamentoDialog(false);
      setSelectedConta(null);
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-financeiro'] });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const totalPendente = contas?.filter(c => c.status !== 'pago').reduce((acc, c) => acc + Number(c.valor), 0) || 0;
  const totalPago = contas?.filter(c => c.status === 'pago').reduce((acc, c) => acc + Number(c.valor_pago || c.valor), 0) || 0;
  const totalVencido = contas?.filter(c => c.status !== 'pago' && isPast(new Date(c.data_vencimento)) && !isToday(new Date(c.data_vencimento))).reduce((acc, c) => acc + Number(c.valor), 0) || 0;

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total A Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVencido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pago (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Centro Custo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas?.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{conta.descricao}</TableCell>
                  <TableCell>{conta.parceiros?.razao_social_nome || '-'}</TableCell>
                  <TableCell>{conta.centro_custos?.nome || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(conta.valor))}</TableCell>
                  <TableCell>{getStatusBadge(conta)}</TableCell>
                  <TableCell>
                    {conta.status !== 'pago' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRegistrarPagamento(conta)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!contas || contas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma conta a pagar cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              {selectedConta?.descricao}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor Original</Label>
              <p className="text-lg font-semibold">{selectedConta && formatCurrency(selectedConta.valor)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorPago">Valor Pago</Label>
              <Input
                id="valorPago"
                type="number"
                step="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataPagamento">Data do Pagamento</Label>
              <Input
                id="dataPagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {contasBancarias?.map((cb) => (
                    <SelectItem key={cb.id} value={cb.id}>
                      {cb.banco_nome} - Ag: {cb.agencia} / Conta: {cb.conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPagamento} disabled={loading || !valorPago}>
              {loading ? 'Salvando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasPagarFinanceiroTab;
