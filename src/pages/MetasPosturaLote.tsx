import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Save, TrendingUp, Scale, Egg, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FasePosturaBadge } from '@/components/lotes/postura/FasePosturaBadge';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem_postura: string | null;
  nucleo: { nome: string; tipo_producao: string } | null;
  galpao: { nome: string } | null;
}

interface MetasPostura {
  id?: string;
  meta_pico_postura: number;
  semana_pico: number;
  meta_persistencia: number;
  meta_viabilidade: number;
  meta_ovos_incubaveis: number;
  meta_peso_ovo_g: number;
}

interface DesempenhoReferencia {
  semana: number;
  peso_kg: number;
  consumo_diario_kg: number;
  producao_percentual: number | null;
  peso_ovo_g: number | null;
  ovos_ave_alojada: number | null;
  viabilidade_percentual: number | null;
  fase: string;
}

interface PesagemData {
  semana: number;
  peso_real_g: number;
}

interface ProducaoData {
  semana: number;
  percentual_postura: number;
  ovos_acumulados: number;
}

const linhagemLabels: Record<string, string> = {
  lohmann_brown_lite: 'Lohmann Brown-Lite',
  lohmann_lsl_lite: 'Lohmann LSL Lite',
  hy_line_brown: 'Hy-Line Brown',
  isa_brown: 'ISA Brown',
  dekalb_white: 'Dekalb White',
};

export default function MetasPosturaLote() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<Lote | null>(null);
  const [metas, setMetas] = useState<MetasPostura | null>(null);
  const [editingMetas, setEditingMetas] = useState<MetasPostura>({
    meta_pico_postura: 95,
    semana_pico: 28,
    meta_persistencia: 0.5,
    meta_viabilidade: 95,
    meta_ovos_incubaveis: 85,
    meta_peso_ovo_g: 62,
  });
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [producaoData, setProducaoData] = useState<ProducaoData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState<number>(0);

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
        linhagem_postura,
        nucleo:nucleos(nome, tipo_producao),
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

    // Fetch recebimento para quantidade alojada
    const { data: recebimentoData } = await supabase
      .from('recebimento_lotes')
      .select('quantidade_mortos, quantidade_eliminados_locomotor, quantidade_eliminados_classificacao')
      .eq('lote_id', loteId)
      .maybeSingle();

    let qtdAlojada = loteData.quantidade_aves;
    if (recebimentoData) {
      const mortos = (recebimentoData as any).quantidade_mortos || 0;
      const elim1 = (recebimentoData as any).quantidade_eliminados_locomotor || 0;
      const elim2 = (recebimentoData as any).quantidade_eliminados_classificacao || 0;
      qtdAlojada = loteData.quantidade_aves - mortos - elim1 - elim2;
    }
    setQuantidadeAlojada(qtdAlojada);

    // Fetch metas de postura
    const { data: metasData } = await supabase
      .from('metas_postura')
      .select('*')
      .eq('lote_id', loteId)
      .maybeSingle();

    if (metasData) {
      const m = {
        id: metasData.id,
        meta_pico_postura: Number(metasData.meta_pico_postura) || 95,
        semana_pico: Number(metasData.semana_pico) || 28,
        meta_persistencia: Number(metasData.meta_persistencia) || 0.5,
        meta_viabilidade: Number(metasData.meta_viabilidade) || 95,
        meta_ovos_incubaveis: Number(metasData.meta_ovos_incubaveis) || 85,
        meta_peso_ovo_g: Number(metasData.meta_peso_ovo_g) || 62,
      };
      setMetas(m);
      setEditingMetas(m);
    }

    // Fetch desempenho referência postura
    if (loteData.linhagem_postura) {
      const { data: desempenhoData } = await supabase
        .from('desempenho_postura')
        .select('*')
        .eq('linhagem', loteData.linhagem_postura as any)
        .order('semana', { ascending: true });

      if (desempenhoData) {
        setDesempenhoReferencia(desempenhoData as DesempenhoReferencia[]);
      }
    }

    // Fetch pesagens do lote (para peso durante cria/recria)
    const { data: pesagensData } = await supabase
      .from('pesagens')
      .select(`
        data_pesagem,
        pesagem_itens (
          quantidade_aves,
          peso_liquido_kg
        )
      `)
      .eq('lote_id', loteId)
      .order('data_pesagem', { ascending: true });

    if (pesagensData && loteData.data_alojamento) {
      const pesagensProcessed: PesagemData[] = pesagensData.map((p: any) => {
        const totalAves = p.pesagem_itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
        const totalPeso = p.pesagem_itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_kg || 0), 0);
        const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
        // Usar +1 para que dia do alojamento = Dia 1, semana 1 = dias 1-7
        const dias = calcularIdadeNaData(loteData.data_alojamento!, p.data_pesagem);
        const semana = Math.ceil(dias / 7);
        
        return {
          semana,
          peso_real_g: pesoMedio,
        };
      });
      setPesagens(pesagensProcessed);
    }

    // Fetch produção de ovos
    const { data: producaoOvosData } = await supabase
      .from('producao_ovos')
      .select('data_producao, percentual_postura, quantidade_ovos')
      .eq('lote_id', loteId)
      .order('data_producao', { ascending: true });

    if (producaoOvosData && loteData.data_alojamento) {
      const weeklyData: Record<number, { total: number; count: number; ovos: number }> = {};
      
      producaoOvosData.forEach((p: any) => {
        const dias = calcularIdadeNaData(loteData.data_alojamento!, p.data_producao);
        const semana = Math.ceil(dias / 7);
        
        if (!weeklyData[semana]) {
          weeklyData[semana] = { total: 0, count: 0, ovos: 0 };
        }
        weeklyData[semana].total += p.percentual_postura || 0;
        weeklyData[semana].count += 1;
        weeklyData[semana].ovos += p.quantidade_ovos || 0;
      });

      let acumulado = 0;
      const processed: ProducaoData[] = Object.entries(weeklyData)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([semana, data]) => {
          acumulado += data.ovos;
          return {
            semana: parseInt(semana),
            percentual_postura: data.count > 0 ? data.total / data.count : 0,
            ovos_acumulados: acumulado,
          };
        });
      
      setProducaoData(processed);
    }

    setLoadingData(false);
  };

  const handleSaveMetas = async () => {
    if (!loteId || !user) return;

    setSaving(true);

    try {
      const insertData = {
        lote_id: loteId,
        integrado_id: user.id,
        meta_pico_postura: editingMetas.meta_pico_postura,
        semana_pico: editingMetas.semana_pico,
        meta_persistencia: editingMetas.meta_persistencia,
        meta_viabilidade: editingMetas.meta_viabilidade,
        meta_ovos_incubaveis: editingMetas.meta_ovos_incubaveis,
        meta_peso_ovo_g: editingMetas.meta_peso_ovo_g,
      };

      const { error } = await supabase
        .from('metas_postura')
        .upsert(insertData, { onConflict: 'lote_id' });

      if (error) throw error;

      toast.success('Metas salvas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSaving(false);
    }
  };

  const handleUsarReferencia = () => {
    if (desempenhoReferencia.length === 0) return;

    // Find peak production
    const peakRef = desempenhoReferencia.reduce((max, curr) => 
      (curr.producao_percentual || 0) > (max.producao_percentual || 0) ? curr : max
    , desempenhoReferencia[0]);

    if (peakRef) {
      setEditingMetas(prev => ({
        ...prev,
        meta_pico_postura: peakRef.producao_percentual || 95,
        semana_pico: peakRef.semana,
        meta_peso_ovo_g: desempenhoReferencia.find(r => r.semana === 50)?.peso_ovo_g || 64,
      }));
      toast.info('Valores de referência aplicados');
    }
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

  const semanasDesdeAlojamento = lote?.data_alojamento
    ? Math.ceil(calcularIdadeLote(lote.data_alojamento) / 7)
    : 0;

  // Chart data for peso (cria/recria)
  const pesoChartData = desempenhoReferencia
    .filter(d => d.semana <= 18)
    .map(ref => {
      const pesagemReal = pesagens.find(p => p.semana === ref.semana);
      return {
        semana: ref.semana,
        referencia: ref.peso_kg,
        real: pesagemReal?.peso_real_g || null,
      };
    });

  // Chart data for produção (semana 19+)
  const producaoChartData = desempenhoReferencia
    .filter(d => d.semana >= 19)
    .map(ref => {
      const prodReal = producaoData.find(p => p.semana === ref.semana);
      return {
        semana: ref.semana,
        referencia: ref.producao_percentual,
        real: prodReal?.percentual_postura || null,
      };
    });

  // Last values
  const ultimoPeso = pesagens.length > 0 ? pesagens[pesagens.length - 1] : null;
  const ultimaProducao = producaoData.length > 0 ? producaoData[producaoData.length - 1] : null;
  const pesoReferenciaAtual = desempenhoReferencia.find(d => d.semana === semanasDesdeAlojamento);
  const producaoReferenciaAtual = desempenhoReferencia.find(d => d.semana === semanasDesdeAlojamento);

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
                <span className="text-xl font-bold text-foreground">Metas Postura</span>
                {lote && (
                  <p className="text-sm text-muted-foreground">
                    {lote.nucleo?.nome} - {lote.galpao?.nome}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FasePosturaBadge semanasVida={semanasDesdeAlojamento} />
            <Badge variant="outline">Semana {semanasDesdeAlojamento}</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pt-24">
        {loadingData ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : (
          <Tabs defaultValue="peso" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="peso" className="gap-2">
                <Scale className="w-4 h-4" />
                Peso
              </TabsTrigger>
              <TabsTrigger value="producao" className="gap-2">
                <Egg className="w-4 h-4" />
                Produção
              </TabsTrigger>
              <TabsTrigger value="viabilidade" className="gap-2">
                <Activity className="w-4 h-4" />
                Viabilidade
              </TabsTrigger>
              <TabsTrigger value="metas" className="gap-2">
                <Target className="w-4 h-4" />
                Metas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Peso & Crescimento */}
            <TabsContent value="peso" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Scale className="w-4 h-4" />
                      Último Peso
                    </div>
                    <p className="text-2xl font-bold">
                      {ultimoPeso ? `${ultimoPeso.peso_real_g.toFixed(0)} g` : '-'}
                    </p>
                    {ultimoPeso && (
                      <p className="text-xs text-muted-foreground">Semana {ultimoPeso.semana}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Target className="w-4 h-4" />
                      Peso Referência
                    </div>
                    <p className="text-2xl font-bold">
                      {pesoReferenciaAtual ? `${pesoReferenciaAtual.peso_kg.toFixed(0)} g` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Semana {semanasDesdeAlojamento}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <TrendingUp className="w-4 h-4" />
                      Diferença
                    </div>
                    {ultimoPeso && pesoReferenciaAtual ? (
                      <>
                        <p className={`text-2xl font-bold ${
                          ultimoPeso.peso_real_g >= pesoReferenciaAtual.peso_kg ? 'text-primary' : 'text-destructive'
                        }`}>
                          {((ultimoPeso.peso_real_g / pesoReferenciaAtual.peso_kg - 1) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ultimoPeso.peso_real_g >= pesoReferenciaAtual.peso_kg ? 'Acima' : 'Abaixo'} da referência
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold">-</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolução de Peso (Cria/Recria)</CardTitle>
                  <CardDescription>Comparação peso real vs referência - Semanas 1 a 18</CardDescription>
                </CardHeader>
                <CardContent>
                  {pesoChartData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Sem dados de referência</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pesoChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="semana" 
                            className="text-xs"
                            label={{ value: 'Semana', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            className="text-xs"
                            label={{ value: 'Peso (g)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                            }}
                          />
                          <Legend />
                          {semanasDesdeAlojamento <= 18 && (
                            <ReferenceLine 
                              x={semanasDesdeAlojamento} 
                              stroke="hsl(var(--primary))" 
                              strokeDasharray="5 5" 
                              label={{ value: 'Atual', fill: 'hsl(var(--primary))' }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="referencia"
                            name="Referência"
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="5 5"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="real"
                            name="Real"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Curva de Produção */}
            <TabsContent value="producao" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Egg className="w-4 h-4" />
                      % Postura Atual
                    </div>
                    <p className="text-2xl font-bold">
                      {ultimaProducao ? `${ultimaProducao.percentual_postura.toFixed(1)}%` : '-'}
                    </p>
                    {ultimaProducao && (
                      <p className="text-xs text-muted-foreground">Semana {ultimaProducao.semana}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Target className="w-4 h-4" />
                      % Referência
                    </div>
                    <p className="text-2xl font-bold">
                      {producaoReferenciaAtual?.producao_percentual 
                        ? `${producaoReferenciaAtual.producao_percentual.toFixed(1)}%` 
                        : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Semana {semanasDesdeAlojamento}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Egg className="w-4 h-4" />
                      Ovos Acumulados
                    </div>
                    <p className="text-2xl font-bold">
                      {ultimaProducao ? ultimaProducao.ovos_acumulados.toLocaleString('pt-BR') : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quantidadeAlojada > 0 && ultimaProducao
                        ? `${(ultimaProducao.ovos_acumulados / quantidadeAlojada).toFixed(1)} ovos/ave`
                        : '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {semanasDesdeAlojamento < 19 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Produção inicia na semana 19. Atualmente na semana {semanasDesdeAlojamento}.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Curva de Produção</CardTitle>
                  <CardDescription>Comparação % postura real vs referência - Semana 19+</CardDescription>
                </CardHeader>
                <CardContent>
                  {producaoChartData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Sem dados de referência</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={producaoChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="semana" 
                            className="text-xs"
                            label={{ value: 'Semana', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            className="text-xs"
                            domain={[0, 100]}
                            label={{ value: '% Postura', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                            }}
                          />
                          <Legend />
                          {semanasDesdeAlojamento >= 19 && (
                            <ReferenceLine 
                              x={semanasDesdeAlojamento} 
                              stroke="hsl(var(--primary))" 
                              strokeDasharray="5 5" 
                              label={{ value: 'Atual', fill: 'hsl(var(--primary))' }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="referencia"
                            name="Referência"
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="5 5"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="real"
                            name="Real"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Viabilidade */}
            <TabsContent value="viabilidade" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Viabilidade do Lote</CardTitle>
                  <CardDescription>Comparação viabilidade real vs referência</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Dados de viabilidade serão calculados a partir da mortalidade registrada.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Metas Configuráveis */}
            <TabsContent value="metas" className="space-y-6">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleUsarReferencia} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Usar Referência
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Produção
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Meta Pico Postura (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingMetas.meta_pico_postura}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, meta_pico_postura: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Semana do Pico</Label>
                      <Input
                        type="number"
                        value={editingMetas.semana_pico}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, semana_pico: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Persistência (% queda/semana)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingMetas.meta_persistencia}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, meta_persistencia: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Egg className="w-4 h-4 text-primary" />
                      Qualidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Meta Viabilidade (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingMetas.meta_viabilidade}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, meta_viabilidade: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Meta Ovos Incubáveis (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingMetas.meta_ovos_incubaveis}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, meta_ovos_incubaveis: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Meta Peso Ovo (g)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editingMetas.meta_peso_ovo_g}
                        onChange={(e) => setEditingMetas(prev => ({ ...prev, meta_peso_ovo_g: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate('/meus-lotes')}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveMetas} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Metas'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
