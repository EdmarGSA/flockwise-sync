import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Home, MapPin, ArrowLeft, Plus, Bird, Calendar, BarChart3, Pencil } from 'lucide-react';
import { NucleoForm } from '@/components/lotes/NucleoForm';
import { GalpaoForm } from '@/components/lotes/GalpaoForm';
import { GalpaoEditForm } from '@/components/lotes/GalpaoEditForm';
import { AreaForm } from '@/components/campo/AreaForm';
import { LoteForm } from '@/components/lotes/LoteForm';
import { DesempenhoForm } from '@/components/campo/DesempenhoForm';
import { DesempenhoTable } from '@/components/campo/DesempenhoTable';
import { DesempenhoCSVImport } from '@/components/campo/DesempenhoCSVImport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type DesempenhoAve = Database['public']['Tables']['desempenho_aves']['Row'];

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
  const navigate = useNavigate();
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [desempenhoData, setDesempenhoData] = useState<DesempenhoAve[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('lotes');
  const [showForm, setShowForm] = useState(false);
  const [loteDialogOpen, setLoteDialogOpen] = useState(false);
  const [editingGalpao, setEditingGalpao] = useState<Galpao | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    
    const [nucleosRes, galpoesRes, areasRes, lotesRes, desempenhoRes] = await Promise.all([
      supabase.from('nucleos').select('id, nome, cidade, estado, tipo_producao, ativo, latitude, longitude'),
      supabase.from('galpoes').select('*,nucleo:nucleos(nome)'),
      supabase.from('areas').select('id, nome, descricao, cor, ativo'),
      supabase.from('lotes').select(`
        id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_fechamento,
        linhagem, status, veterinario_id, nucleo:nucleos(nome), galpao:galpoes(nome)
      `).order('created_at', { ascending: false }),
      supabase.from('desempenho_aves').select('*').order('dia', { ascending: true })
    ]);

    if (nucleosRes.data) setNucleos(nucleosRes.data);
    if (galpoesRes.data) setGalpoes(galpoesRes.data as Galpao[]);
    if (areasRes.data) setAreas(areasRes.data);
    if (lotesRes.data) setLotes(lotesRes.data as Lote[]);
    if (desempenhoRes.data) setDesempenhoData(desempenhoRes.data);
    
    setLoadingData(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getTipoProducaoLabel = (tipo: string) => {
    return tipo === 'corte' ? 'Aves de Corte' : 'Aves de Postura';
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      alojado: { label: 'Alojado', variant: 'default' },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Bird className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Gestão de Campo
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              <TabsTrigger value="lotes" className="flex items-center gap-2">
                <Bird className="h-4 w-4" />
                Lotes
              </TabsTrigger>
              <TabsTrigger value="nucleos" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Núcleos
              </TabsTrigger>
              <TabsTrigger value="galpoes" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Galpões
              </TabsTrigger>
              <TabsTrigger value="areas" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Áreas
              </TabsTrigger>
              <TabsTrigger value="desempenho" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Desempenho
              </TabsTrigger>
            </TabsList>

            {activeTab === 'lotes' ? (
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
                  <LoteForm onSuccess={handleLoteSuccess} />
                </DialogContent>
              </Dialog>
            ) : activeTab !== 'desempenho' ? (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="w-4 h-4" />
                {showForm ? 'Fechar Formulário' : 'Novo Cadastro'}
              </Button>
            ) : (
              <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="w-4 h-4" />
                {showForm ? 'Fechar Formulário' : 'Novo Registro'}
              </Button>
            )}
          </div>

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
              <CardHeader>
                <CardTitle className="text-foreground">Todos os Lotes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : lotes.length === 0 ? (
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotes.map((lote) => (
                          <TableRow key={lote.id}>
                            <TableCell>{getStatusBadge(lote.status)}</TableCell>
                            <TableCell className="font-medium">{lote.nucleo?.nome || '-'}</TableCell>
                            <TableCell>{lote.galpao?.nome || '-'}</TableCell>
                            <TableCell>{lote.quantidade_aves.toLocaleString('pt-BR')}</TableCell>
                            <TableCell>{getLinhagemLabel(lote.linhagem)}</TableCell>
                            <TableCell>{formatDate(lote.data_prevista_alojamento)}</TableCell>
                            <TableCell>{formatDate(lote.data_alojamento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nucleos" className="space-y-6">
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <NucleoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Núcleos Cadastrados ({nucleos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : nucleos.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum núcleo cadastrado.</p>
                      <Button variant="link" onClick={() => setShowForm(true)}>
                        Cadastrar primeiro núcleo
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>GPS</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nucleos.map((nucleo) => (
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="galpoes" className="space-y-6">
            <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-2' : ''} gap-6`}>
              {showForm && <GalpaoForm onSuccess={handleFormSuccess} />}
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Galpões Cadastrados ({galpoes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : galpoes.length === 0 ? (
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
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {galpoes.map((galpao) => (
                            <TableRow key={galpao.id}>
                              <TableCell className="font-medium">{galpao.nome}</TableCell>
                              <TableCell>{galpao.nucleo?.nome || '-'}</TableCell>
                              <TableCell>{galpao.comprimento}x{galpao.largura}x{galpao.altura}</TableCell>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cor</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
            <DesempenhoTable data={desempenhoData} loading={loadingData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
