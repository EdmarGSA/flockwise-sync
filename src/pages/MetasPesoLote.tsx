import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Save, TrendingUp, Scale, Book } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem: string;
  sexo: string;
  peso_medio_pintinhos: number | null;
  nucleo: { nome: string } | null;
  galpao: { nome: string } | null;
}

interface MetasPeso {
  id?: string;
  peso_inicial_kg: number;
  meta_7_dias_kg: number;
  meta_14_dias_kg: number;
  meta_21_dias_kg: number;
  meta_28_dias_kg: number;
  meta_35_dias_kg: number;
  meta_42_dias_kg: number;
  gpd_kg: number;
}

interface PesagemData {
  dia: number;
  peso_real_kg: number;
  data_pesagem: string;
}

interface DesempenhoReferencia {
  dia: number;
  peso_g: number;
  ganho_diario_g: number;
  consumo_diario_racao_g: number;
  conversao_alimentar_acumulada: number;
}

export default function MetasPesoLote() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<Lote | null>(null);
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMetas, setEditingMetas] = useState<MetasPeso | null>(null);

  useEffect(() => {
    if (user && loteId) {
      fetchData();
    }
  }, [user, loteId]);

  const fetchData = async () => {
    setLoadingData(true);

    // Fetch lote data
    const { data: loteData, error: loteError } = await supabase
      .from('lotes')
      .select(`
        id,
        quantidade_aves,
        data_alojamento,
        linhagem,
        sexo,
        peso_medio_pintinhos,
        nucleo:nucleos(nome),
        galpao:galpoes(nome)
      `)
      .eq('id', loteId)
      .maybeSingle();

    if (loteError || !loteData) {
      console.error('Erro ao buscar lote:', loteError);
      toast.error('Lote não encontrado');
      navigate('/meus-lotes');
      return;
    }

    setLote(loteData as Lote);

    // Fetch metas de peso
    const { data: metasData } = await supabase
      .from('metas_peso')
      .select('*')
      .eq('lote_id', loteId)
      .maybeSingle();

    if (metasData) {
      const metas: MetasPeso = {
        id: metasData.id,
        peso_inicial_kg: Number(metasData.peso_inicial_kg),
        meta_7_dias_kg: Number(metasData.meta_7_dias_kg),
        meta_14_dias_kg: Number(metasData.meta_14_dias_kg),
        meta_21_dias_kg: Number(metasData.meta_21_dias_kg),
        meta_28_dias_kg: Number(metasData.meta_28_dias_kg),
        meta_35_dias_kg: Number(metasData.meta_35_dias_kg),
        meta_42_dias_kg: Number(metasData.meta_42_dias_kg),
        gpd_kg: Number(metasData.gpd_kg),
      };
      setMetas(metas);
      setEditingMetas(metas);
    } else if (loteData.peso_medio_pintinhos) {
      // Calculate default metas based on peso_medio_pintinhos
      const pesoInicial = Number(loteData.peso_medio_pintinhos);
      const calculatedMetas = calcularMetas(pesoInicial);
      setEditingMetas(calculatedMetas);
    }

    // Fetch desempenho de referência para linhagem e sexo do lote
    const { data: desempenhoData } = await supabase
      .from('desempenho_aves')
      .select('dia, peso_g, ganho_diario_g, consumo_diario_racao_g, conversao_alimentar_acumulada')
      .eq('linhagem', loteData.linhagem)
      .eq('sexo', loteData.sexo)
      .order('dia', { ascending: true });

    if (desempenhoData) {
      setDesempenhoReferencia(desempenhoData);
    }

    // Fetch pesagens
    const { data: pesagensData } = await supabase
      .from('pesagens')
      .select(`
        data_pesagem,
        pesagem_itens (
          quantidade_aves,
          peso_liquido_g
        )
      `)
      .eq('lote_id', loteId)
      .order('data_pesagem', { ascending: true });

    if (pesagensData && loteData.data_alojamento) {
      const pesagensProcessed: PesagemData[] = pesagensData.map((p: any) => {
        const totalAves = p.pesagem_itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
        const totalPeso = p.pesagem_itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
        const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
        const dia = differenceInDays(new Date(p.data_pesagem), new Date(loteData.data_alojamento));
        
        return {
          dia,
          peso_real_kg: pesoMedio,
          data_pesagem: p.data_pesagem,
        };
      });
      setPesagens(pesagensProcessed);
    }

    setLoadingData(false);
  };

  const calcularMetas = (pesoInicial: number): MetasPeso => {
    const meta7 = pesoInicial * 4.5;
    const meta14 = meta7 * 2.6;
    const meta21 = meta14 * 1.9;
    const meta28 = meta21 * 1.6;
    const meta35 = meta28 * 1.4;
    const meta42 = meta35 * 1.3;
    const gpd = (meta42 - pesoInicial) / 42;

    return {
      peso_inicial_kg: pesoInicial,
      meta_7_dias_kg: meta7,
      meta_14_dias_kg: meta14,
      meta_21_dias_kg: meta21,
      meta_28_dias_kg: meta28,
      meta_35_dias_kg: meta35,
      meta_42_dias_kg: meta42,
      gpd_kg: gpd,
    };
  };

  const handleSaveMetas = async () => {
    if (!editingMetas || !loteId || !user) return;

    setSaving(true);

    try {
      if (metas?.id) {
        // Update existing
        const { error } = await supabase
          .from('metas_peso')
          .update({
            peso_inicial_kg: editingMetas.peso_inicial_kg,
            meta_7_dias_kg: editingMetas.meta_7_dias_kg,
            meta_14_dias_kg: editingMetas.meta_14_dias_kg,
            meta_21_dias_kg: editingMetas.meta_21_dias_kg,
            meta_28_dias_kg: editingMetas.meta_28_dias_kg,
            meta_35_dias_kg: editingMetas.meta_35_dias_kg,
            meta_42_dias_kg: editingMetas.meta_42_dias_kg,
            gpd_kg: editingMetas.gpd_kg,
          })
          .eq('id', metas.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('metas_peso')
          .insert({
            lote_id: loteId,
            integrado_id: user.id,
            peso_inicial_kg: editingMetas.peso_inicial_kg,
            meta_7_dias_kg: editingMetas.meta_7_dias_kg,
            meta_14_dias_kg: editingMetas.meta_14_dias_kg,
            meta_21_dias_kg: editingMetas.meta_21_dias_kg,
            meta_28_dias_kg: editingMetas.meta_28_dias_kg,
            meta_35_dias_kg: editingMetas.meta_35_dias_kg,
            meta_42_dias_kg: editingMetas.meta_42_dias_kg,
            gpd_kg: editingMetas.gpd_kg,
          });

        if (error) throw error;
      }

      toast.success('Metas de peso salvas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas de peso');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = () => {
    if (!editingMetas) return;
    const novasMetas = calcularMetas(editingMetas.peso_inicial_kg);
    setEditingMetas(novasMetas);
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

  // Prepare chart data
  const chartData = [
    { dia: 0, meta: editingMetas?.peso_inicial_kg || 0 },
    { dia: 7, meta: editingMetas?.meta_7_dias_kg || 0 },
    { dia: 14, meta: editingMetas?.meta_14_dias_kg || 0 },
    { dia: 21, meta: editingMetas?.meta_21_dias_kg || 0 },
    { dia: 28, meta: editingMetas?.meta_28_dias_kg || 0 },
    { dia: 35, meta: editingMetas?.meta_35_dias_kg || 0 },
    { dia: 42, meta: editingMetas?.meta_42_dias_kg || 0 },
  ];

  // Merge pesagens into chart data
  pesagens.forEach((p) => {
    const existing = chartData.find((c) => c.dia === p.dia);
    if (existing) {
      (existing as any).real = p.peso_real_kg;
    } else {
      chartData.push({ dia: p.dia, meta: 0, real: p.peso_real_kg } as any);
    }
  });

  chartData.sort((a, b) => a.dia - b.dia);

  const diasDesdeAlojamento = lote?.data_alojamento 
    ? differenceInDays(new Date(), new Date(lote.data_alojamento))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/meus-lotes')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold text-foreground">Metas de Peso</span>
                {lote && (
                  <p className="text-sm text-muted-foreground">
                    {lote.nucleo?.nome} - {lote.galpao?.nome}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Badge variant="secondary" className="gap-1">
            <Scale className="w-3 h-3" />
            {diasDesdeAlojamento} dias
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-28">
        {loadingData ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Peso Real vs Meta
                </CardTitle>
                <CardDescription>
                  Comparativo de peso ao longo do ciclo do lote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="dia" 
                        label={{ value: 'Dias', position: 'insideBottom', offset: -5 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(3)} kg`,
                          name === 'meta' ? 'Meta' : 'Peso Real'
                        ]}
                      />
                      <Legend />
                      <ReferenceLine x={diasDesdeAlojamento} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Hoje" />
                      <Line 
                        type="monotone" 
                        dataKey="meta" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: 'hsl(var(--muted-foreground))' }}
                        name="Meta"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="real" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Peso Real"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Metas Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Configurar Metas
                </CardTitle>
                <CardDescription>
                  Defina as metas de peso para cada semana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingMetas && (
                  <>
                    <div className="space-y-2">
                      <Label>Peso Inicial (kg)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.peso_inicial_kg}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            peso_inicial_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                        <Button variant="outline" onClick={handleRecalcular} size="icon" title="Recalcular">
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 7 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_7_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_7_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 14 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_14_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_14_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 21 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_21_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_21_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 28 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_28_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_28_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 35 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_35_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_35_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta 42 dias (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editingMetas.meta_42_dias_kg.toFixed(3)}
                          onChange={(e) => setEditingMetas({
                            ...editingMetas,
                            meta_42_dias_kg: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                        <span className="font-medium">GPD (kg/dia)</span>
                        <span className="text-lg font-bold text-primary">
                          {editingMetas.gpd_kg.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={handleSaveMetas}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar Metas'}
                    </Button>
                  </>
                )}

                {!editingMetas && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Defina o peso inicial do lote para calcular as metas personalizadas
                    </p>
                    <div className="space-y-2">
                      <Label>Peso Inicial (kg)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Ex: 0.042"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value > 0) {
                              setEditingMetas(calcularMetas(value));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabela de Referência de Desempenho */}
            {desempenhoReferencia.length > 0 && (
              <Card className="lg:col-span-3 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    Referência de Desempenho - {lote?.linhagem?.replace('_', ' ').toUpperCase()} ({lote?.sexo})
                  </CardTitle>
                  <CardDescription>
                    Tabela de referência padrão para comparação de desempenho do lote
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Dia</TableHead>
                          <TableHead className="text-center">Peso (g)</TableHead>
                          <TableHead className="text-center">Ganho Diário (g)</TableHead>
                          <TableHead className="text-center">Consumo Diário (g)</TableHead>
                          <TableHead className="text-center">CA Acumulada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {desempenhoReferencia.filter(d => [0, 7, 14, 21, 28, 35, 42].includes(d.dia)).map((d) => (
                          <TableRow key={d.dia} className={d.dia === diasDesdeAlojamento ? 'bg-primary/10' : ''}>
                            <TableCell className="text-center font-medium">
                              {d.dia}
                              {d.dia === diasDesdeAlojamento && (
                                <Badge variant="secondary" className="ml-2">Hoje</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{d.peso_g.toFixed(0)}</TableCell>
                            <TableCell className="text-center">{d.ganho_diario_g.toFixed(1)}</TableCell>
                            <TableCell className="text-center">{d.consumo_diario_racao_g.toFixed(1)}</TableCell>
                            <TableCell className="text-center">{d.conversao_alimentar_acumulada.toFixed(3)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pesagens Summary */}
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Histórico de Pesagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pesagens.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma pesagem registrada ainda
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {pesagens.map((p, index) => {
                      // Find the closest meta for comparison
                      const metaDia = [0, 7, 14, 21, 28, 35, 42].reduce((prev, curr) =>
                        Math.abs(curr - p.dia) < Math.abs(prev - p.dia) ? curr : prev
                      );
                      const metaValue = editingMetas ? (editingMetas as any)[`meta_${metaDia}_dias_kg`] || editingMetas.peso_inicial_kg : 0;
                      const diff = metaValue > 0 ? ((p.peso_real_kg - metaValue) / metaValue) * 100 : 0;
                      
                      return (
                        <div key={index} className="p-4 rounded-lg bg-muted/50 text-center">
                          <p className="text-xs text-muted-foreground">Dia {p.dia}</p>
                          <p className="text-lg font-bold">{p.peso_real_kg.toFixed(3)} kg</p>
                          <Badge 
                            variant={diff >= 0 ? 'default' : 'destructive'}
                            className="text-xs mt-1"
                          >
                            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(p.data_pesagem), 'dd/MM', { locale: ptBR })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
