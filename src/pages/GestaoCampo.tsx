import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, MapPin, ArrowLeft, Plus, Bird, Calendar, BarChart3, Pencil, Filter, LayoutDashboard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NucleoForm } from '@/components/lotes/NucleoForm';
import { NucleoEditForm } from '@/components/lotes/NucleoEditForm';
import { GalpaoForm } from '@/components/lotes/GalpaoForm';
import { GalpaoEditForm } from '@/components/lotes/GalpaoEditForm';
import { AreaForm } from '@/components/campo/AreaForm';
import { AreaEditForm } from '@/components/campo/AreaEditForm';
import { LoteForm } from '@/components/lotes/LoteForm';
import { LotePosturaForm } from '@/components/lotes/postura/LotePosturaForm';
import { LoteDashboardDialog } from '@/components/campo/LoteDashboardDialog';
import { DesempenhoForm } from '@/components/campo/DesempenhoForm';
import { DesempenhoEditForm } from '@/components/campo/DesempenhoEditForm';
import { DesempenhoTable } from '@/components/campo/DesempenhoTable';
import { DesempenhoCSVImport } from '@/components/campo/DesempenhoCSVImport';
import { GestorDashboard } from '@/components/campo/GestorDashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type DesempenhoAve = Database['public']['Tables']['desempenho_aves']['Row'];
type NucleoRow = Database['public']['Tables']['nucleos']['Row'];
type AreaRow = Database['public']['Tables']['areas']['Row'];
type LoteRow = Database['public']['Tables']['lotes']['Row'];

interface GrupoAnimal {
  id: string;
  nome: string;
}

interface Nucleo {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  tipo_producao: string;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface Galpao {
  id: string;
  nome: string;
  comprimento: number;
  largura: number;
  altura: number;
  tipo_pressao: Database['public']['Enums']['tipo_pressao'];
  nucleo_id: string;
  nucleo: { nome: string } | null;
  ativo: boolean;
  total_aves: number | null;
  aves_por_m2: number | null;
  silo_id: string | null;
  silo_quantidade: number;
  silo_volume_total: number | null;
  comedouro_tipo: Database['public']['Enums']['tipo_comedouro'];
  comedouro_quantidade: number;
  bebedouro_tipo: Database['public']['Enums']['tipo_bebedouro'];
  bebedouro_quantidade: number;
  ventilador_quantidade: number;
  caixa_agua_quantidade: number;
  caixa_agua_volume_total: number | null;
  created_at: string;
  updated_at: string;
}

interface Area {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

interface Lote {
  id: string;
  quantidade_aves: number;
  data_prevista_alojamento: string;
  data_alojamento: string | null;
  data_fechamento: string | null;
  linhagem: string;
  status: string;
  veterinario_id: string | null;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
}

export default function GestaoCampo() {
  const { user, loading } = useAuth();
  const { integradoId, loading: loadingIntegrado } = useIntegradoId();
  const navigate = useNavigate();
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [desempenhoData, setDesempenhoData] = useState<DesempenhoAve[]>([]);
  const [gruposAnimal, setGruposAnimal] = useState<GrupoAnimal[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [loteDialogOpen, setLoteDialogOpen] = useState(false);
  const [editingGalpao, setEditingGalpao] = useState<Galpao | null>(null);
  const [editingNucleo, setEditingNucleo] = useState<NucleoRow | null>(null);
  const [editingArea, setEditingArea] = useState<AreaRow | null>(null);
  const [editingLote, setEditingLote] = useState<LoteRow | null>(null);
  const [editingDesempenho, setEditingDesempenho] = useState<DesempenhoAve | null>(null);
  const [filterGrupoNucleos, setFilterGrupoNucleos] = useState<string>('all');
  const [filterGrupoGalpoes, setFilterGrupoGalpoes] = useState<string>('all');
  const [filterGrupoLotes, setFilterGrupoLotes] = useState<string>('all');
  const [tipoLoteAbertura, setTipoLoteAbertura] = useState<'corte' | 'postura'>('corte');

  useEffect(() => {
    if (integradoId) {
      fetchData();
    }
  }, [integradoId]);

  const fetchData = async () => {
    if (!integradoId) return;
    setLoadingData(true);
    
    const [nucleosRes, galpoesRes, areasRes, lotesRes, desempenhoRes, gruposRes] = await Promise.all([
      supabase.from('nucleos').select('id, nome, cidade, estado, tipo_producao, ativo, latitude, longitude').eq('integrado_id', integradoId),
      supabase.from('galpoes').select('*,nucleo:nucleos!inner(nome)').eq('nucleo.integrado_id', integradoId),
      supabase.from('areas').select('id, nome, descricao, cor, ativo').eq('integrado_id', integradoId),
      supabase.from('lotes').select(`
        id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_fechamento,
        linhagem, status, veterinario_id, galpao_id, nucleo:nucleos(nome), galpao:galpoes(nome)
      `).eq('integrado_id', integradoId).order('created_at', { ascending: false }),
      supabase.from('desempenho_aves').select('*').order('dia', { ascending: true }),
      supabase.from('grupos_animal').select('id, nome').eq('ativo', true).eq('integrado_id', integradoId)
    ]);

    if (nucleosRes.data) setNucleos(nucleosRes.data);
    if (galpoesRes.data) setGalpoes(galpoesRes.data as Galpao[]);
    if (areasRes.data) setAreas(areasRes.data);
    if (lotesRes.data) setLotes(lotesRes.data as Lote[]);
    if (desempenhoRes.data) setDesempenhoData(desempenhoRes.data);
    if (gruposRes.data) setGruposAnimal(gruposRes.data);
    
    setLoadingData(false);
  };

  if (loading || loadingIntegrado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getTipoProducaoLabel = (tipoId: string) => {
    // Check if it's a UUID (grupo_animal id)
    const grupo = gruposAnimal.find(g => g.id === tipoId);
    if (grupo) return grupo.nome;
    
    // Fallback for old enum values
    if (tipoId === 'corte') return 'Aves de Corte';
    if (tipoId === 'postura') return 'Aves de Postura';
    return tipoId;
  };

  const getTipoPressaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      positiva: 'Pressão Positiva',
      negativa: 'Pressão Negativa',
      darkhouse: 'Dark House',
    };
    return labels[tipo] || tipo;
  };

  const handleFormSuccess = () => {
    fetchData();
    setShowForm(false);
  };

  const handleLoteSuccess = () => {
    fetchData();
    setLoteDialogOpen(false);
  };

  const handleGalpaoEditSuccess = () => {
    fetchData();
    setEditingGalpao(null);
  };

  const handleNucleoEditSuccess = () => {
    fetchData();
    setEditingNucleo(null);
  };

  const handleAreaEditSuccess = () => {
    fetchData();
    setEditingArea(null);
  };

  const handleLoteEditSuccess = () => {
    fetchData();
    setEditingLote(null);
  };

  const handleDesempenhoEditSuccess = () => {
    fetchData();
    setEditingDesempenho(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      agendado: { label: 'Agendado', variant: 'outline' },
      alojado: { label: 'Alojado', variant: 'default' },
      em_producao: { label: 'Em Produção', variant: 'default' },
      jejum: { label: 'Jejum', variant: 'destructive' },
      saiu_para_entrega: { label: 'Saiu p/ Entrega', variant: 'secondary' },
      abatido: { label: 'Abatido', variant: 'secondary' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLinhagemLabel = (linhagem: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[linhagem] || linhagem;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const lotesAtivos = lotes.filter(l => l.status === 'alojado').length;
  const lotesPendentes = lotes.filter(l => l.status === 'previsao').length;

  // Filtered data based on grupo_animal selection
  const filteredNucleos = filterGrupoNucleos === 'all' 
    ? nucleos 
    : nucleos.filter(n => n.tipo_producao === filterGrupoNucleos);
  
  const filteredGalpoes = filterGrupoGalpoes === 'all'
    ? galpoes
    : galpoes.filter(g => {
        const nucleo = nucleos.find(n => n.id === g.nucleo_id);
        return nucleo?.tipo_producao === filterGrupoGalpoes;
      });

  // Get nucleo tipo_producao for each lote to enable filtering
  const getLoteTipoProducao = (lote: Lote) => {
    // Find the galpao by ID for reliable matching
    const galpao = galpoes.find(g => g.id === (lote as any).galpao_id);
    if (!galpao) return null;
    const nucleo = nucleos.find(n => n.id === galpao.nucleo_id);
    return nucleo?.tipo_producao || null;
  };

  const filteredLotes = filterGrupoLotes === 'all'
    ? lotes
    : lotes.filter(l => getLoteTipoProducao(l) === filterGrupoLotes);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Bird className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                Gestão de Campo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:w-auto sm:grid sm:grid-cols-6">
                <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="lotes" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <Bird className="h-4 w-4" />
                  <span className="hidden sm:inline">Lotes</span>
                </TabsTrigger>
                <TabsTrigger value="nucleos" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Núcleos</span>
                </TabsTrigger>
                <TabsTrigger value="galpoes" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Galpões</span>
                </TabsTrigger>
                <TabsTrigger value="areas" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Áreas</span>
                </TabsTrigger>
                <TabsTrigger value="desempenho" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Desemp.</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {activeTab === 'dashboard' ? null : activeTab === 'lotes' ? (
              <Dialog open={loteDialogOpen} onOpenChange={setLoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Abrir Lote
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Abertura de Lote</DialogTitle>
                  </DialogHeader>
                  <Tabs value={tipoLoteAbertura} onValueChange={(v) => setTipoLoteAbertura(v as 'corte' | 'postura')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="corte">🐔 Aves Corte</TabsTrigger>
                      <TabsTrigger value="postura">🥚 Aves Postura</TabsTrigger>
                    </TabsList>
                    <TabsContent value="corte">
                      <LoteForm onSuccess={handleLoteSuccess} />
                    </TabsContent>
                    <TabsContent value="postura">
                      <LotePosturaForm onSuccess={handleLoteSuccess} />
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            ) : activeTab === 'desempenho' ? (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="w-4 h-4" />
                {showForm ? 'Fechar Formulário' : 'Novo Registro'}
              </Button>
            ) : (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="w-4 h-4" />
                {showForm ? 'Fechar Formulário' : 'Novo Cadastro'}
              </Button>
            )}
          </div>

          <TabsContent value="dashboard">
            {integradoId && <GestorDashboard integradoId={integradoId} />}
          </TabsContent>

          <TabsContent value="lotes" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Lotes Alojados</p>
                      <p className="text-2xl font-bold text-primary">{lotesAtivos}</p>
                    </div>
                    <Bird className="w-8 h-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Previstos</p>
                      <p className="text-2xl font-bold text-amber-500">{lotesPendentes}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Núcleos</p>
                      <p className="text-2xl font-bold text-muted-foreground">{nucleos.length}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-foreground">
                  Lotes Cadastrados ({filteredLotes.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filterGrupoLotes} onValueChange={setFilterGrupoLotes}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {gruposAnimal.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : filteredLotes.length === 0 ? (
                  <div className="text-center py-12">
                    <Bird className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhum lote cadastrado ainda.</p>
                    <Button onClick={() => setLoteDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Abrir Primeiro Lote
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Núcleo</TableHead>
                          <TableHead>Galpão</TableHead>
                          <TableHead>Qtd. Aves</TableHead>
                          <TableHead>Linhagem</TableHead>
                          <TableHead>Previsão</TableHead>
                          <TableHead>Alojamento</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLotes.map((lote) => (
                          <TableRow key={lote.id}>
                            <TableCell>{getStatusBadge(lote.status)}</TableCell>
                            <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                            <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                            <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>{getLinhagemLabel(lote.linhagem)}</TableCell>
                            <TableCell>{formatDate(lote.data_prevista_alojamento)}</TableCell>
                            <TableCell>{formatDate(lote.data_alojamento)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const { data } = await supabase.from('lotes').select('*').eq('id', lote.id).single();
                                  if (data) setEditingLote(data);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <Dialog open={!!editingLote} onOpenChange={(open) => !open && setEditingLote(null)}>
                      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Lote</DialogTitle>
                        </DialogHeader>
                        {editingLote && (
                          <LoteDashboardDialog
                            lote={editingLote}
                            onSuccess={handleLoteEditSuccess}
                            onCancel={() => setEditingLote(null)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nucleos" className="space-y-6">
            {/* Filter by grupo_animal */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtrar por:</span>
              <Select value={filterGrupoNucleos} onValueChange={setFilterGrupoNucleos}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {gruposAnimal.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <NucleoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Núcleos Cadastrados ({filteredNucleos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : filteredNucleos.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum núcleo cadastrado.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>
                        Cadastrar primeiro núcleo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>GPS</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredNucleos.map((nucleo) => (
                            <TableRow key={nucleo.id}>
                              <TableCell className="font-medium">{nucleo.nome}</TableCell>
                              <TableCell>{nucleo.cidade}/{nucleo.estado}</TableCell>
                              <TableCell>{getTipoProducaoLabel(nucleo.tipo_producao)}</TableCell>
                              <TableCell>
                                {nucleo.latitude && nucleo.longitude ? (
                                  <Badge variant="outline" className="text-primary">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Sem GPS</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={nucleo.ativo ? 'default' : 'secondary'}>
                                  {nucleo.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const { data } = await supabase.from('nucleos').select('*').eq('id', nucleo.id).single();
                                    if (data) setEditingNucleo(data);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Dialog open={!!editingNucleo} onOpenChange={(open) => !open && setEditingNucleo(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Núcleo</DialogTitle>
                          </DialogHeader>
                          {editingNucleo && (
                            <NucleoEditForm
                              nucleo={editingNucleo}
                              onSuccess={handleNucleoEditSuccess}
                              onCancel={() => setEditingNucleo(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="galpoes" className="space-y-6">
            {/* Filter by grupo_animal */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtrar por:</span>
              <Select value={filterGrupoGalpoes} onValueChange={setFilterGrupoGalpoes}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {gruposAnimal.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <GalpaoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Galpões Cadastrados ({filteredGalpoes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : filteredGalpoes.length === 0 ? (
                    <div className="text-center py-8">
                      <Home className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum galpão cadastrado.</p>
                      {nucleos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Cadastre um núcleo primeiro.</p>
                      ) : (
                        <Button variant="link" onClick={() => setShowForm(true)}>
                          Cadastrar primeiro galpão
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Núcleo</TableHead>
                            <TableHead>Dimensões (m)</TableHead>
                            <TableHead>Aves/m²</TableHead>
                            <TableHead>Total Aves</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredGalpoes.map((galpao) => (
                            <TableRow key={galpao.id}>
                              <TableCell className="font-medium">{galpao.nome}</TableCell>
                              <TableCell>{galpao.nucleo?.nome || '-'}</TableCell>
                              <TableCell>{galpao.comprimento}x{galpao.largura}x{galpao.altura}</TableCell>
                              <TableCell>{galpao.aves_por_m2?.toFixed(2) || '-'}</TableCell>
                              <TableCell>{galpao.total_aves?.toLocaleString('pt-BR') || '-'}</TableCell>
                              <TableCell>{getTipoPressaoLabel(galpao.tipo_pressao)}</TableCell>
                              <TableCell>
                                <Badge variant={galpao.ativo ? 'default' : 'secondary'}>
                                  {galpao.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingGalpao(galpao)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Dialog open={!!editingGalpao} onOpenChange={(open) => !open && setEditingGalpao(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Galpão</DialogTitle>
                          </DialogHeader>
                          {editingGalpao && (
                            <GalpaoEditForm
                              galpao={editingGalpao}
                              onSuccess={handleGalpaoEditSuccess}
                              onCancel={() => setEditingGalpao(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="areas" className="space-y-6">
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <AreaForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Áreas Cadastradas ({areas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhuma área cadastrada.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>
                        Cadastrar primeira área
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cor</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {areas.map((area) => (
                            <TableRow key={area.id}>
                              <TableCell>
                                <div 
                                  className="w-6 h-6 rounded-full border-2 border-border" 
                                  style={{ backgroundColor: area.cor }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{area.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{area.descricao || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={area.ativo ? 'default' : 'secondary'}>
                                  {area.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const { data } = await supabase.from('areas').select('*').eq('id', area.id).single();
                                    if (data) setEditingArea(data);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Dialog open={!!editingArea} onOpenChange={(open) => !open && setEditingArea(null)}>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Área</DialogTitle>
                          </DialogHeader>
                          {editingArea && (
                            <AreaEditForm
                              area={editingArea}
                              integradoId={user!.id}
                              onSuccess={handleAreaEditSuccess}
                              onCancel={() => setEditingArea(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="desempenho" className="space-y-6">
            {showForm && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DesempenhoForm onSuccess={handleFormSuccess} />
                <DesempenhoCSVImport onSuccess={handleFormSuccess} />
              </div>
            )}
            <DesempenhoTable 
              data={desempenhoData} 
              loading={loadingData} 
              onEdit={setEditingDesempenho}
            />

            <Dialog open={!!editingDesempenho} onOpenChange={(open) => !open && setEditingDesempenho(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Registro de Desempenho</DialogTitle>
                </DialogHeader>
                {editingDesempenho && (
                  <DesempenhoEditForm
                    desempenho={editingDesempenho}
                    onSuccess={handleDesempenhoEditSuccess}
                    onCancel={() => setEditingDesempenho(null)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
