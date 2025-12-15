import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Check, Link, RefreshCw, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface ConciliacaoTabProps {
  userId: string;
}

const ConciliacaoTab = ({ userId }: ConciliacaoTabProps) => {
  const queryClient = useQueryClient();
  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [novaMovDialog, setNovaMovDialog] = useState(false);
  const [matchDialog, setMatchDialog] = useState(false);
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState<any>(null);

  const [novaMov, setNovaMov] = useState({
    data_movimento: format(new Date(), 'yyyy-MM-dd'),
    descricao: '',
    valor: '',
    tipo: 'credito' as 'credito' | 'debito',
    documento_ref: ''
  });

  // Contas bancárias
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-conciliacao', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('integrado_id', userId)
        .eq('ativo', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Movimentações não conciliadas
  const { data: movimentacoes, isLoading } = useQuery({
    queryKey: ['movimentacoes-bancarias', userId, contaSelecionada],
    queryFn: async () => {
      if (!contaSelecionada) return [];
      
      const { data, error } = await supabase
        .from('movimentacoes_bancarias')
        .select('*')
        .eq('integrado_id', userId)
        .eq('conta_bancaria_id', contaSelecionada)
        .order('data_movimento', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!contaSelecionada
  });

  // Sugestões de match para uma movimentação
  const { data: sugestoes } = useQuery({
    queryKey: ['sugestoes-match', movimentacaoSelecionada?.id],
    queryFn: async () => {
      if (!movimentacaoSelecionada) return { pagar: [], receber: [] };
      
      const valor = Number(movimentacaoSelecionada.valor);
      const margemValor = valor * 0.05; // 5% de margem
      
      if (movimentacaoSelecionada.tipo === 'debito') {
        // Buscar contas a pagar com valor similar
        const { data, error } = await supabase
          .from('contas_pagar')
          .select('*')
          .eq('integrado_id', userId)
          .in('status', ['previsto', 'pendente'])
          .gte('valor', valor - margemValor)
          .lte('valor', valor + margemValor);
        
        if (error) throw error;
        return { pagar: data || [], receber: [] };
      } else {
        // Buscar contas a receber com valor similar
        const { data, error } = await supabase
          .from('contas_receber')
          .select('*')
          .eq('integrado_id', userId)
          .in('status', ['previsao', 'pendente'])
          .gte('valor', valor - margemValor)
          .lte('valor', valor + margemValor);
        
        if (error) throw error;
        return { pagar: [], receber: data || [] };
      }
    },
    enabled: !!movimentacaoSelecionada && matchDialog
  });

  // Criar movimentação
  const criarMovimentacao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('movimentacoes_bancarias')
        .insert({
          integrado_id: userId,
          conta_bancaria_id: contaSelecionada,
          data_movimento: novaMov.data_movimento,
          descricao: novaMov.descricao,
          valor: parseFloat(novaMov.valor),
          tipo: novaMov.tipo,
          documento_ref: novaMov.documento_ref || null,
          origem: 'manual'
        });
      
      if (error) throw error;

      // Atualizar saldo da conta
      const contaAtual = contasBancarias?.find(c => c.id === contaSelecionada);
      if (contaAtual) {
        const novoSaldo = novaMov.tipo === 'credito' 
          ? Number(contaAtual.saldo_atual) + parseFloat(novaMov.valor)
          : Number(contaAtual.saldo_atual) - parseFloat(novaMov.valor);
        
        await supabase
          .from('contas_bancarias')
          .update({ saldo_atual: novoSaldo })
          .eq('id', contaSelecionada);
      }
    },
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      setNovaMovDialog(false);
      setNovaMov({
        data_movimento: format(new Date(), 'yyyy-MM-dd'),
        descricao: '',
        valor: '',
        tipo: 'credito',
        documento_ref: ''
      });
    },
    onError: () => {
      toast.error("Erro ao registrar movimentação");
    }
  });

  // Conciliar movimentação
  const conciliarMovimentacao = useMutation({
    mutationFn: async ({ movId, contaPagarId, contaReceberId }: { movId: string, contaPagarId?: string, contaReceberId?: string }) => {
      // Atualizar movimentação
      const { error: errorMov } = await supabase
        .from('movimentacoes_bancarias')
        .update({
          conciliado: true,
          data_conciliacao: new Date().toISOString(),
          conta_pagar_id: contaPagarId || null,
          conta_receber_id: contaReceberId || null
        })
        .eq('id', movId);
      
      if (errorMov) throw errorMov;

      // Atualizar status da conta a pagar/receber
      if (contaPagarId) {
        await supabase
          .from('contas_pagar')
          .update({ status: 'pago', data_pagamento: movimentacaoSelecionada.data_movimento })
          .eq('id', contaPagarId);
      }
      if (contaReceberId) {
        await supabase
          .from('contas_receber')
          .update({ status: 'recebido', data_recebimento: movimentacaoSelecionada.data_movimento })
          .eq('id', contaReceberId);
      }
    },
    onSuccess: () => {
      toast.success("Movimentação conciliada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      setMatchDialog(false);
      setMovimentacaoSelecionada(null);
    },
    onError: () => {
      toast.error("Erro ao conciliar movimentação");
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const contaAtual = contasBancarias?.find(c => c.id === contaSelecionada);
  const movNaoConciliadas = movimentacoes?.filter(m => !m.conciliado) || [];
  const movConciliadas = movimentacoes?.filter(m => m.conciliado) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Conciliação Bancária</h2>
          <p className="text-sm text-muted-foreground">Vincule movimentações bancárias às contas</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione uma conta..." />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias?.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.banco_nome} - Ag: {conta.agencia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {contaSelecionada && (
            <Dialog open={novaMovDialog} onOpenChange={setNovaMovDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Movimentação Bancária</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={novaMov.data_movimento}
                        onChange={(e) => setNovaMov({ ...novaMov, data_movimento: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={novaMov.tipo} onValueChange={(v: 'credito' | 'debito') => setNovaMov({ ...novaMov, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credito">Crédito (Entrada)</SelectItem>
                          <SelectItem value="debito">Débito (Saída)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={novaMov.descricao}
                      onChange={(e) => setNovaMov({ ...novaMov, descricao: e.target.value })}
                      placeholder="Descrição da movimentação..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novaMov.valor}
                        onChange={(e) => setNovaMov({ ...novaMov, valor: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Documento Ref.</Label>
                      <Input
                        value={novaMov.documento_ref}
                        onChange={(e) => setNovaMov({ ...novaMov, documento_ref: e.target.value })}
                        placeholder="Nº cheque, TED..."
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => criarMovimentacao.mutate()}
                    disabled={!novaMov.descricao || !novaMov.valor || criarMovimentacao.isPending}
                  >
                    Registrar Movimentação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {contaAtual && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{contaAtual.banco_nome}</CardTitle>
                <CardDescription>Ag: {contaAtual.agencia} | Cc: {contaAtual.conta}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className={`text-2xl font-bold ${Number(contaAtual.saldo_atual) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {formatCurrency(Number(contaAtual.saldo_atual))}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {contaSelecionada && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-500" />
                Pendentes de Conciliação
                <Badge variant="secondary">{movNaoConciliadas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movNaoConciliadas.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{format(new Date(mov.data_movimento), 'dd/MM')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{mov.descricao}</TableCell>
                      <TableCell className={`text-right font-medium ${mov.tipo === 'credito' ? 'text-green-500' : 'text-destructive'}`}>
                        {mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(Number(mov.valor))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMovimentacaoSelecionada(mov);
                            setMatchDialog(true);
                          }}
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movNaoConciliadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma movimentação pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Conciliadas
                <Badge variant="secondary">{movConciliadas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movConciliadas.slice(0, 10).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{format(new Date(mov.data_movimento), 'dd/MM')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{mov.descricao}</TableCell>
                      <TableCell className={`text-right font-medium ${mov.tipo === 'credito' ? 'text-green-500' : 'text-destructive'}`}>
                        {mov.tipo === 'credito' ? '+' : '-'}{formatCurrency(Number(mov.valor))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movConciliadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma movimentação conciliada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de Match */}
      <Dialog open={matchDialog} onOpenChange={setMatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conciliar Movimentação</DialogTitle>
          </DialogHeader>
          {movimentacaoSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{movimentacaoSelecionada.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(movimentacaoSelecionada.data_movimento), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className={`text-xl font-bold ${movimentacaoSelecionada.tipo === 'credito' ? 'text-green-500' : 'text-destructive'}`}>
                    {formatCurrency(Number(movimentacaoSelecionada.valor))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Sugestões de Match</h4>
                {movimentacaoSelecionada.tipo === 'debito' && sugestoes?.pagar && sugestoes.pagar.length > 0 ? (
                  <div className="space-y-2">
                    {sugestoes.pagar.map((conta: any) => (
                      <div 
                        key={conta.id} 
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => conciliarMovimentacao.mutate({ movId: movimentacaoSelecionada.id, contaPagarId: conta.id })}
                      >
                        <div>
                          <p className="font-medium">{conta.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            Venc: {format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-destructive font-medium">{formatCurrency(Number(conta.valor))}</span>
                          <ArrowDownCircle className="h-4 w-4 text-destructive" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : movimentacaoSelecionada.tipo === 'credito' && sugestoes?.receber && sugestoes.receber.length > 0 ? (
                  <div className="space-y-2">
                    {sugestoes.receber.map((conta: any) => (
                      <div 
                        key={conta.id} 
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => conciliarMovimentacao.mutate({ movId: movimentacaoSelecionada.id, contaReceberId: conta.id })}
                      >
                        <div>
                          <p className="font-medium">{conta.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            Venc: {format(new Date(conta.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500 font-medium">{formatCurrency(Number(conta.valor))}</span>
                          <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma sugestão encontrada com valor similar (±5%)
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => conciliarMovimentacao.mutate({ movId: movimentacaoSelecionada.id })}
              >
                Conciliar sem Vincular
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConciliacaoTab;
