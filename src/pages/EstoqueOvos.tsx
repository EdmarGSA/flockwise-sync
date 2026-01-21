import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Egg, AlertTriangle, Package, History, Search, Settings2, Tag, BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import KardexOvosView from '@/components/ovos/KardexOvosView';
import AjusteInventarioOvosDialog from '@/components/ovos/AjusteInventarioOvosDialog';
import DashboardProducaoDemanda from '@/components/ovos/DashboardProducaoDemanda';
import EtiquetaCaixaOvosDialog from '@/components/ovos/EtiquetaCaixaOvosDialog';

interface EstoqueOvo {
  id: string;
  lote_interno: string;
  tipo_ovo: string;
  classificacao_peso: string;
  data_producao: string;
  data_validade: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  quantidade_reservada: number;
  custo_unitario: number;
  lote_producao_id: string | null;
  observacoes: string | null;
  bloqueado_carencia?: boolean;
  data_liberacao_carencia?: string | null;
  lote?: { galpao?: { nome: string; nucleo?: { nome: string } } };
}

const TIPOS_OVO = [
  { value: 'branco', label: 'Branco' },
  { value: 'castanho', label: 'Castanho' },
  { value: 'vermelho', label: 'Vermelho' },
  { value: 'caipira', label: 'Caipira' },
];

const CLASSIFICACOES_PESO = [
  { value: 'medio', label: 'Médio' },
  { value: 'grande', label: 'Grande' },
  { value: 'extra', label: 'Extra' },
  { value: 'jumbo', label: 'Jumbo' },
];

export default function EstoqueOvos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [estoque, setEstoque] = useState<EstoqueOvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterClassificacao, setFilterClassificacao] = useState<string>('');
  const [activeTab, setActiveTab] = useState('estoque');
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [etiquetaDialogOpen, setEtiquetaDialogOpen] = useState(false);
  const [selectedEstoqueItem, setSelectedEstoqueItem] = useState<EstoqueOvo | null>(null);
  const [liberandoCarencia, setLiberandoCarencia] = useState(false);
  const [formData, setFormData] = useState({
    tipo_ovo: '',
    classificacao_peso: '',
    data_producao: format(new Date(), 'yyyy-MM-dd'),
    data_validade: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    quantidade: 0,
    custo_unitario: 0,
    observacoes: '',
  });

  useEffect(() => {
    if (user) fetchEstoque();
  }, [user]);

  const fetchEstoque = async () => {
    try {
      const { data, error } = await supabase
        .from('estoque_ovos')
        .select(`
          *,
          lote:lotes(
            galpao:galpoes(
              nome,
              nucleo:nucleos(nome)
            )
          )
        `)
        .eq('integrado_id', user?.id)
        .eq('ativo', true)
        .gt('quantidade_atual', 0)
        .order('data_producao', { ascending: true });

      if (error) throw error;
      setEstoque(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar estoque: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Gerar lote interno
      const { data: loteData, error: loteError } = await supabase
        .rpc('gerar_lote_interno_ovos', { p_integrado_id: user.id });

      if (loteError) throw loteError;

      const loteInterno = loteData;

      // Criar registro de estoque
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque_ovos')
        .insert([{
          integrado_id: user.id,
          lote_interno: loteInterno,
          tipo_ovo: formData.tipo_ovo as any,
          classificacao_peso: formData.classificacao_peso as any,
          data_producao: formData.data_producao,
          data_validade: formData.data_validade,
          quantidade_inicial: formData.quantidade,
          quantidade_atual: formData.quantidade,
          custo_unitario: formData.custo_unitario,
          observacoes: formData.observacoes || null,
        }])
        .select()
        .single();

      if (estoqueError) throw estoqueError;

      // Registrar entrada no kardex
      await supabase
        .from('kardex_ovos')
        .insert({
          integrado_id: user.id,
          estoque_ovo_id: estoqueData.id,
          tipo_movimento: 'entrada_manual',
          quantidade: formData.quantidade,
          saldo_anterior: 0,
          saldo_atual: formData.quantidade,
          documento_ref: loteInterno,
          observacao: 'Entrada manual de estoque',
        });

      toast.success(`Lote ${loteInterno} cadastrado com sucesso!`);
      setDialogOpen(false);
      resetForm();
      fetchEstoque();
    } catch (error: any) {
      toast.error('Erro ao cadastrar estoque: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_ovo: '',
      classificacao_peso: '',
      data_producao: format(new Date(), 'yyyy-MM-dd'),
      data_validade: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      quantidade: 0,
      custo_unitario: 0,
      observacoes: '',
    });
  };

  const getValidadeBadge = (dataValidade: string) => {
    const dias = differenceInDays(new Date(dataValidade), new Date());
    if (dias < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (dias <= 3) return <Badge variant="destructive">Vence em {dias}d</Badge>;
    if (dias <= 7) return <Badge className="bg-amber-500">Vence em {dias}d</Badge>;
    return <Badge variant="outline">{dias}d</Badge>;
  };

  const getTipoLabel = (tipo: string) => TIPOS_OVO.find(t => t.value === tipo)?.label || tipo;
  const getClassificacaoLabel = (c: string) => CLASSIFICACOES_PESO.find(cp => cp.value === c)?.label || c;

  const filteredEstoque = estoque.filter(e => {
    const matchSearch = e.lote_interno.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filterTipo || e.tipo_ovo === filterTipo;
    const matchClassificacao = !filterClassificacao || e.classificacao_peso === filterClassificacao;
    return matchSearch && matchTipo && matchClassificacao;
  });

  // Resumo por tipo/classificação
  const resumo = estoque.reduce((acc, item) => {
    const key = `${item.tipo_ovo}-${item.classificacao_peso}`;
    if (!acc[key]) {
      acc[key] = { tipo: item.tipo_ovo, classificacao: item.classificacao_peso, quantidade: 0, reservado: 0 };
    }
    acc[key].quantidade += item.quantidade_atual;
    acc[key].reservado += item.quantidade_reservada;
    return acc;
  }, {} as Record<string, { tipo: string; classificacao: string; quantidade: number; reservado: number }>);

  // Alertas de validade
  const alertasValidade = estoque.filter(e => differenceInDays(new Date(e.data_validade), new Date()) <= 7);

  // Lotes em carência que podem ser liberados
  const lotesCarenciaLiberaveis = estoque.filter(e => 
    e.bloqueado_carencia && 
    e.data_liberacao_carencia && 
    differenceInDays(new Date(e.data_liberacao_carencia), new Date()) <= 0
  );

  const handleAbrirAjuste = (item: EstoqueOvo) => {
    setSelectedEstoqueItem(item);
    setAjusteDialogOpen(true);
  };

  const liberarCarencias = async () => {
    if (lotesCarenciaLiberaveis.length === 0) return;
    
    setLiberandoCarencia(true);
    try {
      const ids = lotesCarenciaLiberaveis.map(l => l.id);
      const { error } = await supabase
        .from('estoque_ovos')
        .update({ bloqueado_carencia: false })
        .in('id', ids);

      if (error) throw error;
      toast.success(`${ids.length} lote(s) liberado(s) da carência`);
      fetchEstoque();
    } catch (error: any) {
      toast.error('Erro ao liberar carências: ' + error.message);
    } finally {
      setLiberandoCarencia(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Egg className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Estoque de Ovos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Gestão FIFO e rastreabilidade</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-28">
        {/* Alertas */}
        {alertasValidade.length > 0 && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">
                {alertasValidade.length} lote(s) com validade próxima ou vencida
              </span>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {Object.values(resumo).map((item, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{getTipoLabel(item.tipo)} {getClassificacaoLabel(item.classificacao)}</div>
                <div className="text-2xl font-bold">{item.quantidade.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  Disponível: {(item.quantidade - item.reservado).toLocaleString()} | Reservado: {item.reservado.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="estoque" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none">
              <Package className="w-4 h-4" /> <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="kardex" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none">
              <History className="w-4 h-4" /> <span className="hidden sm:inline">Movimentação</span><span className="sm:hidden">Movim.</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-none">
              <BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estoque">
            {/* Ações Rápidas */}
            {lotesCarenciaLiberaveis.length > 0 && (
              <Card className="mb-4 border-green-500/50 bg-green-500/10">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 dark:text-green-400">
                      {lotesCarenciaLiberaveis.length} lote(s) com carência vencida podem ser liberados
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={liberarCarencias}
                    disabled={liberandoCarencia}
                  >
                    {liberandoCarencia ? 'Liberando...' : 'Liberar Agora'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>Lotes em Estoque (FIFO)</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEtiquetaDialogOpen(true)}>
                    <Tag className="w-4 h-4 mr-2" /> Etiquetas
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" /> Entrada Manual
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Entrada de Ovos</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Ovo *</Label>
                          <Select value={formData.tipo_ovo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_ovo: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_OVO.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Classificação *</Label>
                          <Select value={formData.classificacao_peso} onValueChange={(v) => setFormData(prev => ({ ...prev, classificacao_peso: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {CLASSIFICACOES_PESO.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Data Produção *</Label>
                          <Input
                            type="date"
                            value={formData.data_producao}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                data_producao: e.target.value,
                                data_validade: format(addDays(new Date(e.target.value), 30), 'yyyy-MM-dd')
                              }));
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data Validade *</Label>
                          <Input
                            type="date"
                            value={formData.data_validade}
                            onChange={(e) => setFormData(prev => ({ ...prev, data_validade: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantidade (unidades) *</Label>
                          <Input
                            type="number"
                            value={formData.quantidade || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                            min={1}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Custo Unitário (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.custo_unitario || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Input
                          value={formData.observacoes}
                          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                          placeholder="Observações opcionais"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={!formData.tipo_ovo || !formData.classificacao_peso || !formData.quantidade}>
                          Cadastrar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por lote..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <Select value={filterTipo || 'all'} onValueChange={(v) => setFilterTipo(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {TIPOS_OVO.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterClassificacao || 'all'} onValueChange={(v) => setFilterClassificacao(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Classif." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {CLASSIFICACOES_PESO.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredEstoque.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum lote em estoque</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lote</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Classificação</TableHead>
                          <TableHead>Produção</TableHead>
                          <TableHead>Validade</TableHead>
                          <TableHead className="text-right">Disponível</TableHead>
                          <TableHead className="text-right">Reservado</TableHead>
                          <TableHead>Origem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEstoque.map((item) => (
                          <TableRow key={item.id} className={item.bloqueado_carencia ? 'bg-destructive/5' : ''}>
                            <TableCell className="font-mono text-sm font-medium">
                              <div className="flex items-center gap-2">
                                {item.lote_interno}
                                {item.bloqueado_carencia && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Carência
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getTipoLabel(item.tipo_ovo)}</Badge>
                            </TableCell>
                            <TableCell>{getClassificacaoLabel(item.classificacao_peso)}</TableCell>
                            <TableCell>{format(new Date(item.data_producao), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getValidadeBadge(item.data_validade)}
                                {item.bloqueado_carencia && item.data_liberacao_carencia && (
                                  <span className="text-xs text-destructive">
                                    Liberação: {format(new Date(item.data_liberacao_carencia), 'dd/MM')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.bloqueado_carencia ? (
                                <span className="text-muted-foreground">Bloqueado</span>
                              ) : (
                                (item.quantidade_atual - item.quantidade_reservada).toLocaleString()
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.quantidade_reservada.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.lote?.galpao?.nucleo?.nome || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kardex">
            <KardexOvosView integradoId={user.id} />
          </TabsContent>

          <TabsContent value="dashboard">
            <DashboardProducaoDemanda integradoId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AjusteInventarioOvosDialog
          open={ajusteDialogOpen}
          onOpenChange={setAjusteDialogOpen}
          estoqueItem={selectedEstoqueItem}
          integradoId={user.id}
          onSuccess={fetchEstoque}
        />

        <EtiquetaCaixaOvosDialog
          open={etiquetaDialogOpen}
          onOpenChange={setEtiquetaDialogOpen}
          integradoId={user.id}
        />
      </main>
    </div>
  );
}
