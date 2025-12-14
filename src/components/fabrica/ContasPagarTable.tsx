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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Search, Check, Calendar, AlertTriangle, Plus, Pencil, Eye, Target, FileText } from 'lucide-react';
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
  numero_documento: string | null;
  juros: number | null;
  multa: number | null;
  desconto: number | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  observacoes: string | null;
  parceiros: {
    razao_social_nome: string;
  } | null;
  contas_bancarias?: {
    banco_nome: string;
    agencia: string;
    conta: string;
  } | null;
  plano_contas?: {
    codigo: string;
    nome: string;
  } | null;
  centro_custos?: {
    codigo: string;
    nome: string;
  } | null;
}

interface ContaBancaria {
  id: string;
  banco_nome: string;
  agencia: string;
  conta: string;
}

interface PlanoContas {
  id: string;
  codigo: string;
  nome: string;
}

interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
}

interface ContasPagarTableProps {
  integradoId: string;
  onRefresh: () => void;
}

const formasPagamento = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cartao', label: 'Cartão' },
];

export default function ContasPagarTable({ integradoId, onRefresh }: ContasPagarTableProps) {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPagamento, setShowPagamento] = useState<ContaPagar | null>(null);
  const [showNovaDialog, setShowNovaDialog] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState<ContaPagar | null>(null);
  
  // Dados auxiliares
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [centroCustos, setCentroCustos] = useState<CentroCusto[]>([]);
  
  // Form de pagamento
  const [pagamentoForm, setPagamentoForm] = useState({
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    valor_pago: 0,
    juros: 0,
    multa: 0,
    desconto: 0,
    forma_pagamento: '',
    conta_bancaria_id: '',
  });

  // Form nova conta
  const [novaContaForm, setNovaContaForm] = useState({
    descricao: '',
    valor: 0,
    data_vencimento: '',
    categoria: '',
    numero_documento: '',
    plano_conta_id: '',
    centro_custo_id: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchContas();
    fetchDadosAuxiliares();
  }, [integradoId]);

  const fetchDadosAuxiliares = async () => {
    try {
      const [contasRes, planoRes, centrosRes] = await Promise.all([
        supabase.from('contas_bancarias').select('id, banco_nome, agencia, conta').eq('integrado_id', integradoId).eq('ativo', true),
        supabase.from('plano_contas').select('id, codigo, nome').eq('integrado_id', integradoId).eq('ativo', true).in('tipo', ['custo', 'despesa']).order('codigo'),
        supabase.from('centro_custos').select('id, codigo, nome').eq('integrado_id', integradoId).eq('ativo', true).order('codigo'),
      ]);
      
      setContasBancarias(contasRes.data || []);
      setPlanoContas(planoRes.data || []);
      setCentroCustos(centrosRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados auxiliares:', error);
    }
  };

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
          numero_documento,
          juros,
          multa,
          desconto,
          valor_pago,
          forma_pagamento,
          conta_bancaria_id,
          plano_conta_id,
          centro_custo_id,
          observacoes,
          parceiros(razao_social_nome),
          contas_bancarias(banco_nome, agencia, conta),
          plano_contas(codigo, nome),
          centro_custos(codigo, nome)
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

  const handleOpenPagamento = (conta: ContaPagar) => {
    setShowPagamento(conta);
    setPagamentoForm({
      data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      valor_pago: conta.valor,
      juros: 0,
      multa: 0,
      desconto: 0,
      forma_pagamento: '',
      conta_bancaria_id: '',
    });
  };

  const calcularValorFinal = () => {
    return pagamentoForm.valor_pago + pagamentoForm.juros + pagamentoForm.multa - pagamentoForm.desconto;
  };

  const handlePagar = async () => {
    if (!showPagamento) return;
    
    if (!pagamentoForm.forma_pagamento) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    try {
      const { error } = await supabase
        .from('contas_pagar')
        .update({ 
          status: 'pago',
          data_pagamento: pagamentoForm.data_pagamento,
          valor_pago: calcularValorFinal(),
          juros: pagamentoForm.juros,
          multa: pagamentoForm.multa,
          desconto: pagamentoForm.desconto,
          forma_pagamento: pagamentoForm.forma_pagamento as 'boleto' | 'pix' | 'transferencia' | 'dinheiro' | 'cheque' | 'cartao',
          conta_bancaria_id: pagamentoForm.conta_bancaria_id || null,
        })
        .eq('id', showPagamento.id);

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

  const handleNovaConta = async () => {
    if (!novaContaForm.descricao || !novaContaForm.valor || !novaContaForm.data_vencimento) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const { error } = await supabase
        .from('contas_pagar')
        .insert({
          integrado_id: integradoId,
          descricao: novaContaForm.descricao,
          valor: novaContaForm.valor,
          data_vencimento: novaContaForm.data_vencimento,
          categoria: novaContaForm.categoria || null,
          numero_documento: novaContaForm.numero_documento || null,
          plano_conta_id: novaContaForm.plano_conta_id || null,
          centro_custo_id: novaContaForm.centro_custo_id || null,
          observacoes: novaContaForm.observacoes || null,
          status: 'pendente',
        });

      if (error) throw error;

      toast.success('Conta a pagar cadastrada');
      setShowNovaDialog(false);
      setNovaContaForm({
        descricao: '',
        valor: 0,
        data_vencimento: '',
        categoria: '',
        numero_documento: '',
        plano_conta_id: '',
        centro_custo_id: '',
        observacoes: '',
      });
      fetchContas();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao cadastrar conta');
    }
  };

  const filteredContas = contas.filter(conta => {
    const matchesSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.parceiros?.razao_social_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conta.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPendente = filteredContas
    .filter(c => ['previsto', 'pendente'].includes(c.status))
    .reduce((sum, c) => sum + c.valor, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Contas a Pagar
          </CardTitle>
          <CardDescription>
            Gerencie suas contas a pagar com classificação contábil
          </CardDescription>
        </div>
        <Button onClick={() => setShowNovaDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between p-4 mb-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalPendente)}
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
              placeholder="Buscar por descrição, fornecedor ou documento..."
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
                  <TableHead>Centro Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conta.descricao}</div>
                        {conta.numero_documento && (
                          <div className="text-xs text-muted-foreground">Doc: {conta.numero_documento}</div>
                        )}
                      </div>
                    </TableCell>
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
                      {formatCurrency(conta.valor)}
                      {conta.valor_pago && conta.valor_pago !== conta.valor && (
                        <div className="text-xs text-muted-foreground">
                          Pago: {formatCurrency(conta.valor_pago)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {conta.centro_custos ? (
                        <Badge variant="outline" className="text-xs">
                          <Target className="w-3 h-3 mr-1" />
                          {conta.centro_custos.codigo}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(conta.status, conta.data_vencimento)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setShowDetalhes(conta)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {['previsto', 'pendente'].includes(conta.status) && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenPagamento(conta)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Pagar
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

      {/* Payment Dialog */}
      <Dialog open={!!showPagamento} onOpenChange={(open) => !open && setShowPagamento(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              {showPagamento?.descricao} - Valor Original: {showPagamento && formatCurrency(showPagamento.valor)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do Pagamento *</Label>
                <Input
                  type="date"
                  value={pagamentoForm.data_pagamento}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, data_pagamento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select 
                  value={pagamentoForm.forma_pagamento} 
                  onValueChange={(v) => setPagamentoForm({ ...pagamentoForm, forma_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Conta Bancária (opcional)</Label>
              <Select 
                value={pagamentoForm.conta_bancaria_id} 
                onValueChange={(v) => setPagamentoForm({ ...pagamentoForm, conta_bancaria_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não especificado</SelectItem>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.banco_nome} - {c.agencia}/{c.conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Valor Base</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pagamentoForm.valor_pago}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor_pago: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Juros (+)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pagamentoForm.juros}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, juros: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Multa (+)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pagamentoForm.multa}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, multa: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto (-)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pagamentoForm.desconto}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, desconto: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Valor Final a Pagar:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(calcularValorFinal())}</span>
              </div>
            </div>
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

      {/* Nova Conta Dialog */}
      <Dialog open={showNovaDialog} onOpenChange={setShowNovaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Nova Conta a Pagar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={novaContaForm.descricao}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, descricao: e.target.value })}
                placeholder="Descrição da conta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novaContaForm.valor}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, valor: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Vencimento *</Label>
                <Input
                  type="date"
                  value={novaContaForm.data_vencimento}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, data_vencimento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Documento</Label>
                <Input
                  value={novaContaForm.numero_documento}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, numero_documento: e.target.value })}
                  placeholder="NF, Boleto, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={novaContaForm.categoria}
                  onChange={(e) => setNovaContaForm({ ...novaContaForm, categoria: e.target.value })}
                  placeholder="Ex: Fornecedores"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Classificação Contábil (Plano de Contas)
              </Label>
              <Select 
                value={novaContaForm.plano_conta_id} 
                onValueChange={(v) => setNovaContaForm({ ...novaContaForm, plano_conta_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta contábil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não classificado</SelectItem>
                  {planoContas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} - {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Centro de Custo
              </Label>
              <Select 
                value={novaContaForm.centro_custo_id} 
                onValueChange={(v) => setNovaContaForm({ ...novaContaForm, centro_custo_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem centro de custo</SelectItem>
                  {centroCustos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} - {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={novaContaForm.observacoes}
                onChange={(e) => setNovaContaForm({ ...novaContaForm, observacoes: e.target.value })}
                placeholder="Observações adicionais"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNovaConta}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog */}
      <Dialog open={!!showDetalhes} onOpenChange={(open) => !open && setShowDetalhes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Detalhes da Conta
            </DialogTitle>
          </DialogHeader>
          {showDetalhes && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{showDetalhes.descricao}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(showDetalhes.status, showDetalhes.data_vencimento)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Valor Original</Label>
                  <p className="font-medium">{formatCurrency(showDetalhes.valor)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimento</Label>
                  <p className="font-medium">{format(new Date(showDetalhes.data_vencimento), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              {showDetalhes.status === 'pago' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Valor Pago</Label>
                      <p className="font-medium text-primary">{formatCurrency(showDetalhes.valor_pago || showDetalhes.valor)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data Pagamento</Label>
                      <p className="font-medium">{showDetalhes.data_pagamento && format(new Date(showDetalhes.data_pagamento), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  {(showDetalhes.juros || showDetalhes.multa || showDetalhes.desconto) && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Juros</Label>
                        <p className="font-medium text-destructive">{formatCurrency(showDetalhes.juros || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Multa</Label>
                        <p className="font-medium text-destructive">{formatCurrency(showDetalhes.multa || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Desconto</Label>
                        <p className="font-medium text-green-600">{formatCurrency(showDetalhes.desconto || 0)}</p>
                      </div>
                    </div>
                  )}
                  {showDetalhes.forma_pagamento && (
                    <div>
                      <Label className="text-muted-foreground">Forma de Pagamento</Label>
                      <p className="font-medium capitalize">{showDetalhes.forma_pagamento}</p>
                    </div>
                  )}
                  {showDetalhes.contas_bancarias && (
                    <div>
                      <Label className="text-muted-foreground">Conta Bancária</Label>
                      <p className="font-medium">{showDetalhes.contas_bancarias.banco_nome} - {showDetalhes.contas_bancarias.agencia}/{showDetalhes.contas_bancarias.conta}</p>
                    </div>
                  )}
                </>
              )}
              {showDetalhes.plano_contas && (
                <div>
                  <Label className="text-muted-foreground">Classificação Contábil</Label>
                  <p className="font-medium">{showDetalhes.plano_contas.codigo} - {showDetalhes.plano_contas.nome}</p>
                </div>
              )}
              {showDetalhes.centro_custos && (
                <div>
                  <Label className="text-muted-foreground">Centro de Custo</Label>
                  <p className="font-medium">{showDetalhes.centro_custos.codigo} - {showDetalhes.centro_custos.nome}</p>
                </div>
              )}
              {showDetalhes.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm">{showDetalhes.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
