import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Pill, Plus, AlertTriangle, Calendar, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface Produto {
  id: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: number;
  custo_medio: number;
}

interface MedicamentoConfig {
  carencia_dias: number;
  via_administracao: string;
  dosagem_padrao: string | null;
}

interface Tratamento {
  id: string;
  produto_id: string;
  dosagem: string;
  via_administracao: string;
  data_inicio: string;
  data_fim: string | null;
  carencia_dias: number;
  data_liberacao_abate: string | null;
  quantidade_utilizada: number;
  unidade_medida: string;
  custo_total: number;
  motivo: string | null;
  observacoes: string | null;
  status: string;
  created_at: string;
  produto?: { nome: string };
  criador?: { full_name: string } | null;
}

interface TratamentosTabProps {
  loteId: string;
  dataAlojamento: string | null;
  dataPrevistaAbate?: string | null;
}

export default function TratamentosTab({ loteId, dataAlojamento, dataPrevistaAbate }: TratamentosTabProps) {
  const { user } = useAuth();
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [medicamentos, setMedicamentos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTratamento, setSelectedTratamento] = useState<Tratamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [alertaCarencia, setAlertaCarencia] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    produto_id: '',
    dosagem: '',
    via_administracao: 'oral',
    data_inicio: new Date(),
    data_fim: null as Date | null,
    carencia_dias: 0,
    quantidade_utilizada: 0,
    unidade_medida: 'ML',
    motivo: '',
    observacoes: '',
  });

  useEffect(() => {
    fetchData();
  }, [loteId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch tratamentos
    const { data: tratamentosData, error } = await supabase
      .from('tratamentos_lote')
      .select('*, produto:produtos(nome)')
      .eq('lote_id', loteId)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tratamentos:', error);
      toast.error('Erro ao carregar tratamentos');
    } else {
      // Fetch user names
      const userIds = [...new Set((tratamentosData || []).map(t => t.criado_por))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const tratamentosWithNames = (tratamentosData || []).map(t => ({
        ...t,
        criador: profilesMap.get(t.criado_por) || null,
      }));

      setTratamentos(tratamentosWithNames as Tratamento[]);
    }

    // Fetch medicamentos (products in Medicamento or Vacina group)
    const { data: produtosData } = await supabase
      .from('produtos')
      .select('id, nome, unidade_medida, estoque_atual, custo_medio, grupo_produto:grupos_produto(nome)')
      .eq('ativo', true)
      .order('nome');

    if (produtosData) {
      const medicamentosFiltrados = produtosData.filter((p: any) => {
        const grupoNome = p.grupo_produto?.nome?.toLowerCase() || '';
        return grupoNome.includes('medicamento') || grupoNome.includes('vacina');
      });
      setMedicamentos(medicamentosFiltrados as Produto[]);
    }

    setLoading(false);
  };

  const handleProdutoChange = async (produtoId: string) => {
    setFormData(prev => ({ ...prev, produto_id: produtoId }));

    // Fetch medicamento config if exists
    const { data: configData } = await supabase
      .from('medicamentos_config')
      .select('*')
      .eq('produto_id', produtoId)
      .maybeSingle();

    if (configData) {
      const config = configData as MedicamentoConfig;
      setFormData(prev => ({
        ...prev,
        carencia_dias: config.carencia_dias,
        via_administracao: config.via_administracao,
        dosagem: config.dosagem_padrao || '',
      }));
    }

    // Get produto unit
    const produto = medicamentos.find(m => m.id === produtoId);
    if (produto) {
      setFormData(prev => ({ ...prev, unidade_medida: produto.unidade_medida }));
    }

    // Check carência alert
    checkCarenciaAlert(produtoId);
  };

  const checkCarenciaAlert = async (produtoId: string) => {
    if (!dataPrevistaAbate) {
      setAlertaCarencia(null);
      return;
    }

    const { data: configData } = await supabase
      .from('medicamentos_config')
      .select('carencia_dias')
      .eq('produto_id', produtoId)
      .maybeSingle();

    const carenciaDias = (configData as MedicamentoConfig)?.carencia_dias || 0;
    const dataAbate = new Date(dataPrevistaAbate);
    const hoje = new Date();
    const diasAteAbate = differenceInDays(dataAbate, hoje);

    if (carenciaDias > 0 && diasAteAbate < carenciaDias) {
      setAlertaCarencia(
        `ATENÇÃO: Este medicamento possui ${carenciaDias} dias de carência. ` +
        `O lote está previsto para abate em ${diasAteAbate} dias. ` +
        `O uso deste medicamento pode impedir o abate na data prevista.`
      );
    } else {
      setAlertaCarencia(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.produto_id || !formData.dosagem.trim()) {
      toast.error('Preencha o medicamento e a dosagem');
      return;
    }

    if (!user) return;

    setSaving(true);

    // Calculate data_liberacao_abate
    const dataLiberacao = formData.carencia_dias > 0
      ? format(addDays(formData.data_fim || formData.data_inicio, formData.carencia_dias), 'yyyy-MM-dd')
      : null;

    // Calculate cost
    const produto = medicamentos.find(m => m.id === formData.produto_id);
    const custoTotal = produto ? formData.quantidade_utilizada * produto.custo_medio : 0;

    const { error } = await supabase
      .from('tratamentos_lote')
      .insert({
        lote_id: loteId,
        integrado_id: user.id,
        criado_por: user.id,
        produto_id: formData.produto_id,
        dosagem: formData.dosagem,
        via_administracao: formData.via_administracao,
        data_inicio: format(formData.data_inicio, 'yyyy-MM-dd'),
        data_fim: formData.data_fim ? format(formData.data_fim, 'yyyy-MM-dd') : null,
        carencia_dias: formData.carencia_dias,
        data_liberacao_abate: dataLiberacao,
        quantidade_utilizada: formData.quantidade_utilizada,
        unidade_medida: formData.unidade_medida,
        custo_total: custoTotal,
        motivo: formData.motivo || null,
        observacoes: formData.observacoes || null,
      });

    if (error) {
      console.error('Erro ao salvar tratamento:', error);
      toast.error('Erro ao salvar tratamento');
      setSaving(false);
      return;
    }

    // Update stock (baixa no estoque)
    if (formData.quantidade_utilizada > 0 && produto) {
      const novoEstoque = produto.estoque_atual - formData.quantidade_utilizada;
      
      // Update produto stock
      await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', formData.produto_id);

      // Create kardex entry
      await supabase
        .from('kardex')
        .insert({
          integrado_id: user.id,
          produto_id: formData.produto_id,
          tipo_movimento: 'SAIDA_TRATAMENTO',
          quantidade: formData.quantidade_utilizada,
          saldo_anterior: produto.estoque_atual,
          saldo_atual: novoEstoque,
          custo_unitario: produto.custo_medio,
          documento_ref: `Tratamento Lote`,
          observacao: formData.motivo || 'Tratamento veterinário',
          criado_por: user.id,
        });
    }

    toast.success('Tratamento registrado com sucesso!');
    setDialogOpen(false);
    resetForm();
    fetchData();
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      produto_id: '',
      dosagem: '',
      via_administracao: 'oral',
      data_inicio: new Date(),
      data_fim: null,
      carencia_dias: 0,
      quantidade_utilizada: 0,
      unidade_medida: 'ML',
      motivo: '',
      observacoes: '',
    });
    setAlertaCarencia(null);
  };

  const handleDelete = async () => {
    if (!selectedTratamento) return;

    const { error } = await supabase
      .from('tratamentos_lote')
      .delete()
      .eq('id', selectedTratamento.id);

    if (error) {
      console.error('Erro ao excluir tratamento:', error);
      toast.error('Erro ao excluir tratamento');
      return;
    }

    toast.success('Tratamento excluído!');
    setDeleteDialogOpen(false);
    setSelectedTratamento(null);
    fetchData();
  };

  const handleFinalizarTratamento = async (tratamento: Tratamento) => {
    const { error } = await supabase
      .from('tratamentos_lote')
      .update({ 
        status: 'finalizado',
        data_fim: format(new Date(), 'yyyy-MM-dd'),
      })
      .eq('id', tratamento.id);

    if (error) {
      toast.error('Erro ao finalizar tratamento');
      return;
    }

    toast.success('Tratamento finalizado!');
    fetchData();
  };

  const getStatusBadge = (tratamento: Tratamento) => {
    if (tratamento.status === 'finalizado') {
      return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />Finalizado</Badge>;
    }
    
    // Check if carência is active
    if (tratamento.data_liberacao_abate) {
      const hoje = new Date();
      const dataLib = new Date(tratamento.data_liberacao_abate);
      if (hoje < dataLib) {
        return <Badge variant="destructive" className="gap-1"><Clock className="w-3 h-3" />Em Carência</Badge>;
      }
    }
    
    return <Badge variant="default" className="gap-1"><Pill className="w-3 h-3" />Ativo</Badge>;
  };

  // Calculate totals
  const custoTotal = tratamentos.reduce((acc, t) => acc + (t.custo_total || 0), 0);
  const tratamentosAtivos = tratamentos.filter(t => t.status === 'ativo').length;
  
  // Check for treatments blocking slaughter
  const tratamentosBloqueando = tratamentos.filter(t => {
    if (!t.data_liberacao_abate) return false;
    return new Date() < new Date(t.data_liberacao_abate);
  });

  return (
    <>
      <div className="space-y-6">
        {/* Alert for treatments blocking slaughter */}
        {tratamentosBloqueando.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alerta de Carência</AlertTitle>
            <AlertDescription>
              {tratamentosBloqueando.length} tratamento(s) em período de carência. 
              O lote não pode ser abatido até{' '}
              {format(
                new Date(Math.max(...tratamentosBloqueando.map(t => new Date(t.data_liberacao_abate!).getTime()))),
                "dd/MM/yyyy",
                { locale: ptBR }
              )}.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Pill className="w-8 h-8 text-purple-500/50" />
                <div>
                  <p className="text-muted-foreground text-sm">Tratamentos Ativos</p>
                  <p className="text-xl font-bold">{tratamentosAtivos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col">
                <p className="text-muted-foreground text-sm">Total de Tratamentos</p>
                <p className="text-xl font-bold">{tratamentos.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col">
                <p className="text-muted-foreground text-sm">Custo Total</p>
                <p className="text-xl font-bold text-primary">
                  R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tratamentos List */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-500" />
                Tratamentos e Medicamentos
              </CardTitle>
              <CardDescription>
                Registro de medicamentos aplicados com controle de carência
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando tratamentos...
              </div>
            ) : tratamentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum tratamento registrado</p>
                <p className="text-sm mt-1">Clique em "Novo" para registrar um tratamento</p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Dosagem</TableHead>
                      <TableHead className="text-center">Carência</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tratamentos.map((tratamento) => (
                      <TableRow key={tratamento.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{tratamento.produto?.nome}</span>
                            {tratamento.motivo && (
                              <p className="text-xs text-muted-foreground">{tratamento.motivo}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(tratamento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                            {tratamento.data_fim && (
                              <span className="text-muted-foreground">
                                {' → '}{format(new Date(tratamento.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span>{tratamento.dosagem}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({tratamento.via_administracao})
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {tratamento.carencia_dias > 0 ? (
                            <div>
                              <Badge variant="outline">{tratamento.carencia_dias}d</Badge>
                              {tratamento.data_liberacao_abate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Lib: {format(new Date(tratamento.data_liberacao_abate), 'dd/MM', { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(tratamento)}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {tratamento.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {tratamento.status === 'ativo' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFinalizarTratamento(tratamento)}
                                title="Finalizar tratamento"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setSelectedTratamento(tratamento);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Treatment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Tratamento</DialogTitle>
            <DialogDescription>
              Registre a aplicação de medicamento ou vacina
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Alerta de carência */}
            {alertaCarencia && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alertaCarencia}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Medicamento / Vacina *</Label>
              <Select value={formData.produto_id} onValueChange={handleProdutoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {medicamentos.map((med) => (
                    <SelectItem key={med.id} value={med.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{med.nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Est: {med.estoque_atual} {med.unidade_medida}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dosagem *</Label>
                <Input
                  placeholder="Ex: 1ml/L de água"
                  value={formData.dosagem}
                  onChange={(e) => setFormData(prev => ({ ...prev, dosagem: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Via de Administração</Label>
                <Select
                  value={formData.via_administracao}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, via_administracao: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oral">Oral (água)</SelectItem>
                    <SelectItem value="injetavel">Injetável</SelectItem>
                    <SelectItem value="ocular">Ocular</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="racao">Ração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(formData.data_inicio, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.data_inicio}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, data_inicio: date }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Fim (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formData.data_fim 
                        ? format(formData.data_fim, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={formData.data_fim || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, data_fim: date || null }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade Utilizada</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.quantidade_utilizada}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade_utilizada: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={formData.unidade_medida}
                  onChange={(e) => setFormData(prev => ({ ...prev, unidade_medida: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Carência (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.carencia_dias}
                  onChange={(e) => setFormData(prev => ({ ...prev, carencia_dias: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo do Tratamento</Label>
              <Input
                placeholder="Ex: Prevenção de Gumboro, Tratamento de Coccidiose..."
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tratamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O tratamento será removido permanentemente.
              Nota: O estoque não será revertido automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
