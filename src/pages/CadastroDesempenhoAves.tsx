import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';
import { MultiplicadoresMetaDialog } from '@/components/cadastro/MultiplicadoresMetaDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Linhagem = 'cobb_500' | 'ross_308' | 'hubbard';
type SexoAve = 'macho' | 'femea' | 'misto';

interface DesempenhoAve {
  id: string;
  dia: number;
  linhagem: Linhagem;
  sexo: SexoAve;
  peso_kg: number;
  ganho_diario_kg: number;
  ganho_medio_diario_kg: number;
  consumo_diario_racao_kg: number;
  consumo_acumulado_racao_kg: number;
  conversao_alimentar_acumulada: number;
}

interface FormData {
  dia: number;
  linhagem: Linhagem;
  sexo: SexoAve;
  peso_kg: number;
  ganho_diario_kg: number;
  ganho_medio_diario_kg: number;
  consumo_diario_racao_kg: number;
  consumo_acumulado_racao_kg: number;
  conversao_alimentar_acumulada: number;
}

interface MultiplicadorDB {
  id: string;
  linhagem: string;
  sexo: string;
  mult_7_dias: number;
  mult_14_dias: number;
  mult_21_dias: number;
  mult_28_dias: number;
  mult_35_dias: number;
  mult_42_dias: number;
}

const linhagemLabels: Record<string, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard',
};

const sexoLabels: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};

const linhagemPosturaLabels: Record<string, string> = {
  lohmann_brown_lite: 'Lohmann Brown-Lite',
  lohmann_lsl_lite: 'Lohmann LSL Lite',
};

const fasePosturaLabels: Record<string, string> = {
  cria: 'Cria',
  recria: 'Recria',
  producao: 'Produção',
};

// Postura Reference Tab Component
interface DesempenhoPostura {
  id: string;
  semana: number;
  linhagem: string;
  fase: string;
  peso_kg: number;
  consumo_diario_kg: number;
  producao_percentual: number | null;
  peso_ovo_g: number | null;
  ovos_ave_alojada: number | null;
  viabilidade_percentual: number | null;
}

function PosturaReferenceTab() {
  const [dataPostura, setDataPostura] = useState<DesempenhoPostura[]>([]);
  const [loadingPostura, setLoadingPostura] = useState(true);
  const [filterLinhagemPostura, setFilterLinhagemPostura] = useState<string>('all');
  const [filterFase, setFilterFase] = useState<string>('all');

  useEffect(() => {
    fetchPosturaData();
  }, []);

  const fetchPosturaData = async () => {
    setLoadingPostura(true);
    const { data: posturaData, error } = await supabase
      .from('desempenho_postura')
      .select('*')
      .order('linhagem')
      .order('semana');

    if (error) {
      console.error('Erro ao buscar dados de postura:', error);
      toast.error('Erro ao carregar dados de desempenho de postura');
    } else {
      setDataPostura(posturaData as DesempenhoPostura[]);
    }
    setLoadingPostura(false);
  };

  const filteredPosturaData = dataPostura.filter((item) => {
    if (filterLinhagemPostura !== 'all' && item.linhagem !== filterLinhagemPostura) return false;
    if (filterFase !== 'all' && item.fase !== filterFase) return false;
    return true;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div>
          <CardTitle>Dados de Desempenho - Aves de Postura</CardTitle>
          <CardDescription>Referência de peso, consumo e produção por semana de vida</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">Linhagem</Label>
            <Select value={filterLinhagemPostura} onValueChange={(v) => setFilterLinhagemPostura(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(linhagemPosturaLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">Fase</Label>
            <Select value={filterFase} onValueChange={(v) => setFilterFase(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(fasePosturaLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingPostura ? (
          <p className="text-muted-foreground py-8 text-center">Carregando...</p>
        ) : filteredPosturaData.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhum registro encontrado</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Semana</TableHead>
                  <TableHead>Linhagem</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead className="text-right">Peso (g)</TableHead>
                  <TableHead className="text-right">Consumo (g/dia)</TableHead>
                  <TableHead className="text-right">% Postura</TableHead>
                  <TableHead className="text-right">Peso Ovo (g)</TableHead>
                  <TableHead className="text-right">Ovos/Ave</TableHead>
                  <TableHead className="text-right">Viabilidade (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosturaData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.semana}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{linhagemPosturaLabels[item.linhagem] || item.linhagem}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fasePosturaLabels[item.fase] || item.fase}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.peso_kg.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{item.consumo_diario_kg.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{item.producao_percentual?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{item.peso_ovo_g?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{item.ovos_ave_alojada?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell className="text-right">{item.viabilidade_percentual?.toFixed(1) ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CadastroDesempenhoAves() {
  const { user, loading } = useAuth();
  const { integradoId } = useIntegradoId();
  const navigate = useNavigate();
  const [data, setData] = useState<DesempenhoAve[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DesempenhoAve | null>(null);
  const [filterLinhagem, setFilterLinhagem] = useState<Linhagem | 'all'>('all');
  const [filterSexo, setFilterSexo] = useState<SexoAve | 'all'>('all');
  
  // Multiplicadores from DB
  const [multiplicadores, setMultiplicadores] = useState<MultiplicadorDB[]>([]);
  const [loadingMult, setLoadingMult] = useState(true);
  const [multDialogOpen, setMultDialogOpen] = useState(false);
  const [editingMult, setEditingMult] = useState<MultiplicadorDB | null>(null);
  const [deleteMultId, setDeleteMultId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    dia: 0,
    linhagem: 'cobb_500',
    sexo: 'misto',
    peso_kg: 0,
    ganho_diario_kg: 0,
    ganho_medio_diario_kg: 0,
    consumo_diario_racao_kg: 0,
    consumo_acumulado_racao_kg: 0,
    conversao_alimentar_acumulada: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (integradoId) {
      fetchMultiplicadores();
    }
  }, [integradoId]);

  const fetchMultiplicadores = async () => {
    if (!integradoId) return;
    setLoadingMult(true);
    const { data: multData, error } = await supabase
      .from('multiplicadores_meta_peso')
      .select('*')
      .eq('integrado_id', integradoId)
      .order('linhagem')
      .order('sexo');

    if (error) {
      console.error('Erro ao buscar multiplicadores:', error);
    } else {
      setMultiplicadores(multData as MultiplicadorDB[]);
    }
    setLoadingMult(false);
  };

  const handleDeleteMult = async () => {
    if (!deleteMultId) return;
    try {
      const { error } = await supabase
        .from('multiplicadores_meta_peso')
        .delete()
        .eq('id', deleteMultId);
      if (error) throw error;
      toast.success('Multiplicadores excluídos com sucesso!');
      fetchMultiplicadores();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir multiplicadores');
    } finally {
      setDeleteMultId(null);
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    const { data: desempenhoData, error } = await supabase
      .from('desempenho_aves')
      .select('*')
      .order('linhagem')
      .order('sexo')
      .order('dia');

    if (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados de desempenho');
    } else {
      setData(desempenhoData as DesempenhoAve[]);
    }
    setLoadingData(false);
  };

  const handleOpenDialog = (item?: DesempenhoAve) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        dia: item.dia,
        linhagem: item.linhagem,
        sexo: item.sexo,
        peso_kg: item.peso_kg,
        ganho_diario_kg: item.ganho_diario_kg,
        ganho_medio_diario_kg: item.ganho_medio_diario_kg,
        consumo_diario_racao_kg: item.consumo_diario_racao_kg,
        consumo_acumulado_racao_kg: item.consumo_acumulado_racao_kg,
        conversao_alimentar_acumulada: item.conversao_alimentar_acumulada,
      });
    } else {
      setEditingItem(null);
      setFormData({
        dia: 0,
        linhagem: 'cobb_500',
        sexo: 'misto',
        peso_kg: 0,
        ganho_diario_kg: 0,
        ganho_medio_diario_kg: 0,
        consumo_diario_racao_kg: 0,
        consumo_acumulado_racao_kg: 0,
        conversao_alimentar_acumulada: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('desempenho_aves')
          .update({
            dia: formData.dia,
            linhagem: formData.linhagem,
            sexo: formData.sexo,
            peso_kg: formData.peso_kg,
            ganho_diario_kg: formData.ganho_diario_kg,
            ganho_medio_diario_kg: formData.ganho_medio_diario_kg,
            consumo_diario_racao_kg: formData.consumo_diario_racao_kg,
            consumo_acumulado_racao_kg: formData.consumo_acumulado_racao_kg,
            conversao_alimentar_acumulada: formData.conversao_alimentar_acumulada,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Registro atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('desempenho_aves')
          .insert({
            dia: formData.dia,
            linhagem: formData.linhagem,
            sexo: formData.sexo,
            peso_kg: formData.peso_kg,
            ganho_diario_kg: formData.ganho_diario_kg,
            ganho_medio_diario_kg: formData.ganho_medio_diario_kg,
            consumo_diario_racao_kg: formData.consumo_diario_racao_kg,
            consumo_acumulado_racao_kg: formData.consumo_acumulado_racao_kg,
            conversao_alimentar_acumulada: formData.conversao_alimentar_acumulada,
          });

        if (error) throw error;
        toast.success('Registro criado com sucesso!');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  };

  const filteredData = data.filter((item) => {
    if (filterLinhagem !== 'all' && item.linhagem !== filterLinhagem) return false;
    if (filterSexo !== 'all' && item.sexo !== filterSexo) return false;
    return true;
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Referência de Desempenho</h1>
              <p className="text-muted-foreground">Tabelas de referência para aves de corte e postura</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="multiplicadores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="multiplicadores" className="gap-2">
              <Calculator className="w-4 h-4" />
              Multiplicadores (Corte)
            </TabsTrigger>
            <TabsTrigger value="referencia" className="gap-2">
              <Target className="w-4 h-4" />
              Referência Corte
            </TabsTrigger>
            <TabsTrigger value="postura" className="gap-2">
              <Target className="w-4 h-4" />
              Referência Postura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="multiplicadores">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Multiplicadores de Meta de Peso</CardTitle>
                  <CardDescription>
                    Configure multiplicadores por linhagem e sexo para cálculo automático das metas
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingMult(null); setMultDialogOpen(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Tabela
                </Button>
              </CardHeader>
              <CardContent>
                {loadingMult ? (
                  <p className="text-muted-foreground py-8 text-center">Carregando...</p>
                ) : multiplicadores.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">Nenhuma tabela de multiplicadores cadastrada</p>
                    <Button variant="outline" onClick={() => { setEditingMult(null); setMultDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar multiplicadores
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {multiplicadores.map((mult) => (
                      <Card key={mult.id} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{linhagemLabels[mult.linhagem] || mult.linhagem}</Badge>
                              <Badge variant="secondary">{sexoLabels[mult.sexo] || mult.sexo}</Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setEditingMult(mult); setMultDialogOpen(true); }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeleteMultId(mult.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <span className="text-muted-foreground">7d</span>
                              <p className="font-mono font-medium">{mult.mult_7_dias}×</p>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">14d</span>
                              <p className="font-mono font-medium">{mult.mult_14_dias}×</p>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">21d</span>
                              <p className="font-mono font-medium">{mult.mult_21_dias}×</p>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">28d</span>
                              <p className="font-mono font-medium">{mult.mult_28_dias}×</p>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">35d</span>
                              <p className="font-mono font-medium">{mult.mult_35_dias}×</p>
                            </div>
                            <div className="text-center">
                              <span className="text-muted-foreground">42d</span>
                              <p className="font-mono font-medium">{mult.mult_42_dias}×</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referencia">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dados de Desempenho</CardTitle>
                  <CardDescription>Referência de peso e consumo por dia de vida</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Registro
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 max-w-xs">
                    <Label className="text-xs text-muted-foreground">Linhagem</Label>
                    <Select value={filterLinhagem} onValueChange={(v) => setFilterLinhagem(v as Linhagem | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {Constants.public.Enums.linhagem_aves.map((l) => (
                          <SelectItem key={l} value={l}>{linhagemLabels[l]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <Label className="text-xs text-muted-foreground">Sexo</Label>
                    <Select value={filterSexo} onValueChange={(v) => setFilterSexo(v as SexoAve | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {Constants.public.Enums.sexo_ave.map((s) => (
                          <SelectItem key={s} value={s}>{sexoLabels[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loadingData ? (
                  <p className="text-muted-foreground py-8 text-center">Carregando...</p>
                ) : filteredData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">Nenhum registro encontrado</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Dia</TableHead>
                          <TableHead>Linhagem</TableHead>
                          <TableHead>Sexo</TableHead>
                          <TableHead className="text-right">Peso (g)</TableHead>
                          <TableHead className="text-right">Ganho/Dia (g)</TableHead>
                          <TableHead className="text-right">Consumo/Dia (g)</TableHead>
                          <TableHead className="text-right">CA Acum.</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.dia}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{linhagemLabels[item.linhagem]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{sexoLabels[item.sexo]}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.peso_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{item.ganho_diario_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{item.consumo_diario_racao_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{item.conversao_alimentar_acumulada.toFixed(3)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
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

      <TabsContent value="postura">
        <PosturaReferenceTab />
      </TabsContent>
    </Tabs>
  </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia</Label>
              <Input
                type="number"
                value={formData.dia}
                onChange={(e) => setFormData({ ...formData, dia: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.peso_kg}
                onChange={(e) => setFormData({ ...formData, peso_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Linhagem</Label>
              <Select value={formData.linhagem} onValueChange={(v) => setFormData({ ...formData, linhagem: v as Linhagem })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.linhagem_aves.map((l) => (
                    <SelectItem key={l} value={l}>{linhagemLabels[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={formData.sexo} onValueChange={(v) => setFormData({ ...formData, sexo: v as SexoAve })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.sexo_ave.map((s) => (
                    <SelectItem key={s} value={s}>{sexoLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ganho Diário (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ganho_diario_kg}
                onChange={(e) => setFormData({ ...formData, ganho_diario_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>GMD (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ganho_medio_diario_kg}
                onChange={(e) => setFormData({ ...formData, ganho_medio_diario_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumo Diário (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_diario_racao_kg}
                onChange={(e) => setFormData({ ...formData, consumo_diario_racao_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumo Acum. (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_acumulado_racao_kg}
                onChange={(e) => setFormData({ ...formData, consumo_acumulado_racao_kg: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Conversão Alimentar Acumulada</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.conversao_alimentar_acumulada}
                onChange={(e) => setFormData({ ...formData, conversao_alimentar_acumulada: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para multiplicadores */}
      <MultiplicadoresMetaDialog
        open={multDialogOpen}
        onOpenChange={setMultDialogOpen}
        integradoId={integradoId || ''}
        onSuccess={fetchMultiplicadores}
        editData={editingMult}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteMultId} onOpenChange={() => setDeleteMultId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir multiplicadores?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os multiplicadores serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMult}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
