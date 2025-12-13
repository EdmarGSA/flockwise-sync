import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Plus, Pencil, Trash2, Save, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';

type Linhagem = 'cobb_500' | 'ross_308' | 'hubbard';
type SexoAve = 'macho' | 'femea' | 'misto';

interface DesempenhoAve {
  id: string;
  dia: number;
  linhagem: Linhagem;
  sexo: SexoAve;
  peso_g: number;
  ganho_diario_g: number;
  ganho_medio_diario_g: number;
  consumo_diario_racao_g: number;
  consumo_acumulado_racao_g: number;
  conversao_alimentar_acumulada: number;
}

interface FormData {
  dia: number;
  linhagem: Linhagem;
  sexo: SexoAve;
  peso_g: number;
  ganho_diario_g: number;
  ganho_medio_diario_g: number;
  consumo_diario_racao_g: number;
  consumo_acumulado_racao_g: number;
  conversao_alimentar_acumulada: number;
}

const linhagemLabels: Record<Linhagem, string> = {
  cobb_500: 'Cobb 500',
  ross_308: 'Ross 308',
  hubbard: 'Hubbard',
};

const sexoLabels: Record<SexoAve, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
  misto: 'Misto',
};

export default function CadastroDesempenhoAves() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DesempenhoAve[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DesempenhoAve | null>(null);
  const [filterLinhagem, setFilterLinhagem] = useState<Linhagem | 'all'>('all');
  const [filterSexo, setFilterSexo] = useState<SexoAve | 'all'>('all');
  
  const [formData, setFormData] = useState<FormData>({
    dia: 0,
    linhagem: 'cobb_500',
    sexo: 'misto',
    peso_g: 0,
    ganho_diario_g: 0,
    ganho_medio_diario_g: 0,
    consumo_diario_racao_g: 0,
    consumo_acumulado_racao_g: 0,
    conversao_alimentar_acumulada: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

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
        peso_g: item.peso_g,
        ganho_diario_g: item.ganho_diario_g,
        ganho_medio_diario_g: item.ganho_medio_diario_g,
        consumo_diario_racao_g: item.consumo_diario_racao_g,
        consumo_acumulado_racao_g: item.consumo_acumulado_racao_g,
        conversao_alimentar_acumulada: item.conversao_alimentar_acumulada,
      });
    } else {
      setEditingItem(null);
      setFormData({
        dia: 0,
        linhagem: 'cobb_500',
        sexo: 'misto',
        peso_g: 0,
        ganho_diario_g: 0,
        ganho_medio_diario_g: 0,
        consumo_diario_racao_g: 0,
        consumo_acumulado_racao_g: 0,
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
            peso_g: formData.peso_g,
            ganho_diario_g: formData.ganho_diario_g,
            ganho_medio_diario_g: formData.ganho_medio_diario_g,
            consumo_diario_racao_g: formData.consumo_diario_racao_g,
            consumo_acumulado_racao_g: formData.consumo_acumulado_racao_g,
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
            peso_g: formData.peso_g,
            ganho_diario_g: formData.ganho_diario_g,
            ganho_medio_diario_g: formData.ganho_medio_diario_g,
            consumo_diario_racao_g: formData.consumo_diario_racao_g,
            consumo_acumulado_racao_g: formData.consumo_acumulado_racao_g,
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
              <h1 className="text-3xl font-bold text-foreground">Referência de Peso</h1>
              <p className="text-muted-foreground">Tabela de desempenho por linhagem e sexo</p>
            </div>
          </div>
        </div>

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
                        <TableCell className="text-right">{item.peso_g.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{item.ganho_diario_g.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{item.consumo_diario_racao_g.toFixed(1)}</TableCell>
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
                value={formData.peso_g}
                onChange={(e) => setFormData({ ...formData, peso_g: parseFloat(e.target.value) || 0 })}
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
                value={formData.ganho_diario_g}
                onChange={(e) => setFormData({ ...formData, ganho_diario_g: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>GMD (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ganho_medio_diario_g}
                onChange={(e) => setFormData({ ...formData, ganho_medio_diario_g: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumo Diário (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_diario_racao_g}
                onChange={(e) => setFormData({ ...formData, consumo_diario_racao_g: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumo Acum. (g)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_acumulado_racao_g}
                onChange={(e) => setFormData({ ...formData, consumo_acumulado_racao_g: parseFloat(e.target.value) || 0 })}
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
    </div>
  );
}
