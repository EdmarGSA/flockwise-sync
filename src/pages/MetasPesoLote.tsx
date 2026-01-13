import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Target, Save, TrendingUp, Scale, Book, Skull, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import PesagemDetalheDialog from '@/components/veterinario/PesagemDetalheDialog';

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
  numSessoes: number;
}

interface PesagemSelecionada {
  dataPesagem: string;
  dia: number;
  pesoReferencia?: number;
}

interface DesempenhoReferencia {
  dia: number;
  peso_g: number;
  ganho_diario_g: number;
  consumo_diario_racao_g: number;
  conversao_alimentar_acumulada: number;
}

interface Multiplicadores {
  mult_7_dias: number;
  mult_14_dias: number;
  mult_21_dias: number;
  mult_28_dias: number;
  mult_35_dias: number;
  mult_42_dias: number;
}

interface MortalidadeMedia {
  mortalidade_7_dias: number;
  mortalidade_14_dias: number;
  mortalidade_21_dias: number;
  mortalidade_28_dias: number;
  mortalidade_35_dias: number;
  mortalidade_42_dias: number;
  mortalidade_acima_42_dias: number;
}

interface MortalidadePorSemana {
  dia: number;
  mortalidade_real: number;
  mortalidade_referencia: number | null;
  acima_limite: boolean;
  quantidade_mortes: number;
}

interface RecebimentoLote {
  quantidade_mortos: number;
  quantidade_eliminados: number;
  quantidade_eliminados_classificacao: number;
  quantidade_eliminados_locomotor: number;
}

const DEFAULT_MULTIPLICADORES: Multiplicadores = {
  mult_7_dias: 4.5,
  mult_14_dias: 2.6,
  mult_21_dias: 1.9,
  mult_28_dias: 1.6,
  mult_35_dias: 1.4,
  mult_42_dias: 1.3,
};

export default function MetasPesoLote() {
  const { user, loading } = useAuth();
  const { integradoId } = useIntegradoId();
  const navigate = useNavigate();
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<Lote | null>(null);
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMetas, setEditingMetas] = useState<MetasPeso | null>(null);
  const [multiplicadores, setMultiplicadores] = useState<Multiplicadores>(DEFAULT_MULTIPLICADORES);
  
  // Mortalidade states
  const [mortalidadeMedia, setMortalidadeMedia] = useState<MortalidadeMedia | null>(null);
  const [mortalidadePorSemana, setMortalidadePorSemana] = useState<MortalidadePorSemana[]>([]);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState<number>(0);
  const [alertasMortalidade, setAlertasMortalidade] = useState<MortalidadePorSemana[]>([]);
  
  // State para PesagemDetalheDialog
  const [pesagemSelecionada, setPesagemSelecionada] = useState<PesagemSelecionada | null>(null);

  useEffect(() => {
    if (user && loteId && integradoId) {
      fetchData();
    }
  }, [user, loteId, integradoId]);

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

    // Buscar multiplicadores específicos da linhagem/sexo do lote
    if (loteData.linhagem && loteData.sexo && integradoId) {
      const { data: mult } = await supabase
        .from('multiplicadores_meta_peso')
        .select('mult_7_dias, mult_14_dias, mult_21_dias, mult_28_dias, mult_35_dias, mult_42_dias')
        .eq('integrado_id', integradoId)
        .eq('linhagem', loteData.linhagem)
        .eq('sexo', loteData.sexo)
        .maybeSingle();
      
      if (mult) {
        setMultiplicadores(mult);
      }
    }

    // Fetch recebimento_lotes para obter quantidade alojada
    const { data: recebimentoData } = await supabase
      .from('recebimento_lotes')
      .select('quantidade_mortos, quantidade_eliminados, quantidade_eliminados_classificacao, quantidade_eliminados_locomotor')
      .eq('lote_id', loteId)
      .maybeSingle();

    let qtdAlojada = loteData.quantidade_aves;
    if (recebimentoData) {
      const rec = recebimentoData as RecebimentoLote;
      const eliminadosTotal = (rec.quantidade_mortos || 0) + 
                             (rec.quantidade_eliminados || 0) + 
                             (rec.quantidade_eliminados_classificacao || 0) + 
                             (rec.quantidade_eliminados_locomotor || 0);
      qtdAlojada = loteData.quantidade_aves - eliminadosTotal;
    }
    setQuantidadeAlojada(qtdAlojada);

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
    } else {
      // peso_medio_pintinhos está em gramas, converter para kg
      const pesoInicialKg = loteData.peso_medio_pintinhos ? Number(loteData.peso_medio_pintinhos) / 1000 : 0;
      if (pesoInicialKg > 0) {
        const calculatedMetas = calcularMetas(pesoInicialKg);
        setEditingMetas(calculatedMetas);
      } else {
        setEditingMetas({
          peso_inicial_kg: 0,
          meta_7_dias_kg: 0,
          meta_14_dias_kg: 0,
          meta_21_dias_kg: 0,
          meta_28_dias_kg: 0,
          meta_35_dias_kg: 0,
          meta_42_dias_kg: 0,
          gpd_kg: 0,
        });
      }
    }

    // Fetch desempenho de referência
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
      // Agrupar todas as pesagens parciais do mesmo dia e contar sessões
      const pesagensPorData = pesagensData.reduce((acc: Record<string, { itens: any[], sessoes: Set<string> }>, p: any) => {
        const data = p.data_pesagem;
        if (!acc[data]) acc[data] = { itens: [], sessoes: new Set() };
        acc[data].itens.push(...p.pesagem_itens);
        // Contar sessões únicas pelo created_at (assumindo formato timestamp)
        const sessaoId = p.created_at || p.id || data;
        acc[data].sessoes.add(sessaoId);
        return acc;
      }, {});

      // Calcular média ponderada consolidada por dia - usando +1 para dia do alojamento = Dia 1
      const pesagensProcessed: PesagemData[] = Object.entries(pesagensPorData).map(([data, { itens, sessoes }]) => {
        const totalAves = itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
        const totalPeso = itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
        const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
        const dia = calcularIdadeNaData(loteData.data_alojamento, data);
        
        return {
          dia,
          peso_real_kg: pesoMedio,
          data_pesagem: data,
          numSessoes: sessoes.size,
        };
      }).sort((a, b) => a.dia - b.dia);
      
      setPesagens(pesagensProcessed);
    }

    // Fetch mortalidade média de referência (filtrar por linhagem/sexo com fallback para misto)
    let mortalidadeMediaData = null;
    
    // Primeiro tenta buscar específico para linhagem + sexo
    const { data: mortalidadeEspecifica } = await supabase
      .from('mortalidade_media')
      .select('*')
      .eq('integrado_id', integradoId!)
      .eq('linhagem', loteData.linhagem)
      .eq('sexo', loteData.sexo)
      .maybeSingle();
    
    if (mortalidadeEspecifica) {
      mortalidadeMediaData = mortalidadeEspecifica;
    } else {
      // Fallback: buscar linhagem + misto
      const { data: mortalidadeMisto } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', integradoId!)
        .eq('linhagem', loteData.linhagem)
        .eq('sexo', 'misto')
        .maybeSingle();
      
      mortalidadeMediaData = mortalidadeMisto;
    }

    if (mortalidadeMediaData) {
      setMortalidadeMedia({
        mortalidade_7_dias: Number(mortalidadeMediaData.mortalidade_7_dias),
        mortalidade_14_dias: Number(mortalidadeMediaData.mortalidade_14_dias),
        mortalidade_21_dias: Number(mortalidadeMediaData.mortalidade_21_dias),
        mortalidade_28_dias: Number(mortalidadeMediaData.mortalidade_28_dias),
        mortalidade_35_dias: Number(mortalidadeMediaData.mortalidade_35_dias),
        mortalidade_42_dias: Number(mortalidadeMediaData.mortalidade_42_dias),
        mortalidade_acima_42_dias: Number(mortalidadeMediaData.mortalidade_acima_42_dias),
      });
    }

    // Fetch mortalidade do lote
    if (loteData.data_alojamento && qtdAlojada > 0) {
      const { data: mortalidadeData } = await supabase
        .from('mortalidade')
        .select(`
          data_registro,
          mortalidade_itens (quantidade)
        `)
        .eq('lote_id', loteId);

      if (mortalidadeData) {
        const dataAlojamento = new Date(loteData.data_alojamento);
        const semanas = [7, 14, 21, 28, 35, 42, 49];
        
        const mortalidadeSemanal: MortalidadePorSemana[] = semanas.map(dia => {
          // Calcular mortes acumuladas até este dia - usando +1 para consistência
          let mortesAcumuladas = 0;
          mortalidadeData.forEach((m: any) => {
            const diasDesdeMort = calcularIdadeNaData(loteData.data_alojamento, m.data_registro);
            if (diasDesdeMort <= dia) {
              mortesAcumuladas += m.mortalidade_itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
            }
          });

          const mortalidadeReal = (mortesAcumuladas / qtdAlojada) * 100;
          
          // Obter referência
          let refKey: keyof MortalidadeMedia | null = null;
          if (dia <= 7) refKey = 'mortalidade_7_dias';
          else if (dia <= 14) refKey = 'mortalidade_14_dias';
          else if (dia <= 21) refKey = 'mortalidade_21_dias';
          else if (dia <= 28) refKey = 'mortalidade_28_dias';
          else if (dia <= 35) refKey = 'mortalidade_35_dias';
          else if (dia <= 42) refKey = 'mortalidade_42_dias';
          else refKey = 'mortalidade_acima_42_dias';

          const refValue = mortalidadeMediaData && refKey ? Number((mortalidadeMediaData as any)[refKey]) : null;

          return {
            dia,
            mortalidade_real: mortalidadeReal,
            mortalidade_referencia: refValue,
            acima_limite: refValue !== null && mortalidadeReal > refValue,
            quantidade_mortes: mortesAcumuladas,
          };
        });

        setMortalidadePorSemana(mortalidadeSemanal);
        
        // Filtrar alertas - usando +1 para consistência
        const diasDesdeAloj = calcularIdadeLote(loteData.data_alojamento);
        const alertas = mortalidadeSemanal.filter(m => m.acima_limite && m.dia <= diasDesdeAloj);
        setAlertasMortalidade(alertas);
      }
    }

    setLoadingData(false);
  };

  const calcularMetas = (pesoInicial: number): MetasPeso => {
    const meta7 = pesoInicial * multiplicadores.mult_7_dias;
    const meta14 = meta7 * multiplicadores.mult_14_dias;
    const meta21 = meta14 * multiplicadores.mult_21_dias;
    const meta28 = meta21 * multiplicadores.mult_28_dias;
    const meta35 = meta28 * multiplicadores.mult_35_dias;
    const meta42 = meta35 * multiplicadores.mult_42_dias;
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
        const { error } = await supabase
          .from('metas_peso')
          .insert({
            lote_id: loteId,
            integrado_id: integradoId!,
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

      toast.success('Metas salvas com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
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

  // Prepare chart data for peso
  const chartData = [0, 7, 14, 21, 28, 35, 42].map(dia => {
    const refData = desempenhoReferencia.find(d => d.dia === dia);
    const metaKeys: Record<number, keyof MetasPeso> = {
      0: 'peso_inicial_kg',
      7: 'meta_7_dias_kg',
      14: 'meta_14_dias_kg',
      21: 'meta_21_dias_kg',
      28: 'meta_28_dias_kg',
      35: 'meta_35_dias_kg',
      42: 'meta_42_dias_kg',
    };
    return {
      dia,
      meta: editingMetas ? editingMetas[metaKeys[dia]] || 0 : 0,
      referencia: refData ? refData.peso_g / 1000 : undefined,
    };
  });

  pesagens.forEach((p) => {
    const existing = chartData.find((c) => c.dia === p.dia);
    if (existing) {
      (existing as any).real = p.peso_real_kg;
    } else {
      const refData = desempenhoReferencia.find(d => d.dia === p.dia);
      chartData.push({ 
        dia: p.dia, 
        meta: 0, 
        real: p.peso_real_kg,
        referencia: refData ? refData.peso_g / 1000 : undefined,
      } as any);
    }
  });

  chartData.sort((a, b) => a.dia - b.dia);

  // Prepare chart data for mortalidade
  const mortalidadeChartData = mortalidadePorSemana.map(m => ({
    dia: m.dia,
    real: m.mortalidade_real,
    referencia: m.mortalidade_referencia,
  }));

  const diasDesdeAlojamento = lote?.data_alojamento 
    ? calcularIdadeLote(lote.data_alojamento)
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
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">Metas</span>
                  {alertasMortalidade.length > 0 && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </div>
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
          <div className="space-y-6">
            {/* Alertas de Mortalidade */}
            {alertasMortalidade.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Mortalidade acima da referência!</AlertTitle>
                <AlertDescription>
                  {alertasMortalidade.map(a => (
                    <span key={a.dia} className="block">
                      Dia {a.dia}: {a.mortalidade_real.toFixed(2)}% (Ref: {a.mortalidade_referencia?.toFixed(2)}%)
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart Peso */}
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
                            name === 'meta' ? 'Meta' : name === 'referencia' ? 'Ref. Linhagem' : 'Peso Real'
                          ]}
                        />
                        <Legend />
                        <ReferenceLine x={diasDesdeAlojamento} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Hoje" />
                        <Line 
                          type="monotone" 
                          dataKey="referencia" 
                          stroke="hsl(var(--chart-3))" 
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ fill: 'hsl(var(--chart-3))' }}
                          name="Ref. Linhagem"
                          connectNulls
                        />
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
                        <div className="flex items-center justify-between">
                          <Label>Peso Inicial (kg)</Label>
                          {lote?.peso_medio_pintinhos && (
                            <span className="text-xs text-muted-foreground">
                              Do lote: {Number(lote.peso_medio_pintinhos).toFixed(3)} kg
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={editingMetas.peso_inicial_kg}
                            onChange={(e) => setEditingMetas({
                              ...editingMetas,
                              peso_inicial_kg: parseFloat(e.target.value) || 0
                            })}
                            placeholder={lote?.peso_medio_pintinhos ? `${Number(lote.peso_medio_pintinhos).toFixed(3)}` : 'Digite o peso inicial'}
                          />
                          <Button variant="outline" onClick={handleRecalcular} size="icon" title="Recalcular">
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { dia: 7, key: 'meta_7_dias_kg' },
                          { dia: 14, key: 'meta_14_dias_kg' },
                          { dia: 21, key: 'meta_21_dias_kg' },
                          { dia: 28, key: 'meta_28_dias_kg' },
                          { dia: 35, key: 'meta_35_dias_kg' },
                          { dia: 42, key: 'meta_42_dias_kg' },
                        ].map(({ dia, key }) => {
                          const metaValue = (editingMetas as any)[key] as number;
                          const refData = desempenhoReferencia.find(d => d.dia === dia);
                          const refValue = refData ? refData.peso_g / 1000 : 0;
                          const diff = refValue > 0 ? ((metaValue - refValue) / refValue) * 100 : 0;
                          
                          return (
                            <div key={dia} className="grid grid-cols-12 gap-2 items-center">
                              <Label className="col-span-3 text-xs">{dia} dias</Label>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={metaValue.toFixed(3)}
                                  onChange={(e) => setEditingMetas({
                                    ...editingMetas,
                                    [key]: parseFloat(e.target.value) || 0
                                  })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              {refValue > 0 && (
                                <>
                                  <div className="col-span-3 text-xs text-muted-foreground text-center">
                                    Ref: {refValue.toFixed(3)}
                                  </div>
                                  <div className="col-span-2">
                                    <Badge 
                                      variant={diff >= 0 ? 'default' : 'destructive'}
                                      className="text-[10px] w-full justify-center"
                                    >
                                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </>
                              )}
                              {refValue === 0 && <div className="col-span-5" />}
                            </div>
                          );
                        })}
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
                      
                      {desempenhoReferencia.length > 0 && (
                        <div className="pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-3">
                            Ou use os valores de referência da linhagem:
                          </p>
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => {
                              const getRefValue = (dia: number) => {
                                const ref = desempenhoReferencia.find(d => d.dia === dia);
                                return ref ? ref.peso_g / 1000 : 0;
                              };
                              const pesoInicial = getRefValue(0);
                              const meta42 = getRefValue(42);
                              const gpd = pesoInicial > 0 && meta42 > 0 ? (meta42 - pesoInicial) / 42 : 0;
                              
                              setEditingMetas({
                                peso_inicial_kg: pesoInicial,
                                meta_7_dias_kg: getRefValue(7),
                                meta_14_dias_kg: getRefValue(14),
                                meta_21_dias_kg: getRefValue(21),
                                meta_28_dias_kg: getRefValue(28),
                                meta_35_dias_kg: getRefValue(35),
                                meta_42_dias_kg: meta42,
                                gpd_kg: gpd,
                              });
                              toast.success('Metas preenchidas com valores de referência');
                            }}
                          >
                            <Book className="w-4 h-4" />
                            Usar Referência ({lote?.linhagem?.replace('_', ' ').toUpperCase()})
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Mortalidade */}
              <Card className="lg:col-span-3 bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Skull className="w-5 h-5" />
                    Mortalidade Real vs Referência
                  </CardTitle>
                  <CardDescription>
                    Comparativo de mortalidade acumulada ao longo do ciclo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!mortalidadeMedia ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Configure a mortalidade média de referência para comparação
                      </p>
                      <Button variant="outline" asChild>
                        <Link to="/configuracoes/mortalidade-media">
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar Referência
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mortalidadeChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="dia" 
                            label={{ value: 'Dias', position: 'insideBottom', offset: -5 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            label={{ value: 'Mortalidade (%)', angle: -90, position: 'insideLeft' }}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(2)}%`,
                              name === 'referencia' ? 'Referência' : 'Mortalidade Real'
                            ]}
                          />
                          <Legend />
                          <ReferenceLine x={diasDesdeAlojamento} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Hoje" />
                          <Line 
                            type="monotone" 
                            dataKey="referencia" 
                            stroke="hsl(var(--chart-4))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: 'hsl(var(--chart-4))' }}
                            name="Referência"
                            connectNulls
                          />
                          <Line 
                            type="monotone" 
                            dataKey="real" 
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--destructive))' }}
                            name="Mortalidade Real"
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Histórico Mortalidade por Semana */}
              {mortalidadePorSemana.length > 0 && (
                <Card className="lg:col-span-3 bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Skull className="w-5 h-5" />
                      Histórico de Mortalidade por Semana
                    </CardTitle>
                    <CardDescription>
                      Quantidade alojada: {quantidadeAlojada.toLocaleString('pt-BR')} aves
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Resumo de Totais */}
                    {(() => {
                      const ultimaSemanaComDados = mortalidadePorSemana
                        .filter(m => m.dia <= diasDesdeAlojamento)
                        .slice(-1)[0];
                      const totalMortalidadeReal = ultimaSemanaComDados?.mortalidade_real || 0;
                      const totalQuantidadeMortes = ultimaSemanaComDados?.quantidade_mortes || 0;
                      
                      // Mortalidade máxima de referência = valor acumulado do dia 42 (ou acima de 42)
                      const totalReferenciaMaxima = mortalidadeMedia 
                        ? (mortalidadeMedia.mortalidade_acima_42_dias || mortalidadeMedia.mortalidade_42_dias || 0)
                        : null;
                      
                      const dentroDoLimite = totalReferenciaMaxima !== null 
                        ? totalMortalidadeReal <= totalReferenciaMaxima 
                        : true;
                      
                      const diferencaPercentual = totalReferenciaMaxima && totalReferenciaMaxima > 0
                        ? ((totalMortalidadeReal - totalReferenciaMaxima) / totalReferenciaMaxima) * 100
                        : 0;

                      return (
                        <div className={`p-4 rounded-lg border ${
                          dentroDoLimite 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-destructive/10 border-destructive/30'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Mortalidade Real Total</p>
                                <p className={`text-2xl font-bold ${!dentroDoLimite ? 'text-destructive' : ''}`}>
                                  {totalQuantidadeMortes.toLocaleString('pt-BR')} <span className="text-base font-normal text-muted-foreground">aves</span>
                                </p>
                                <p className={`text-sm ${!dentroDoLimite ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {totalMortalidadeReal.toFixed(2)}%
                                </p>
                              </div>
                              
                              {totalReferenciaMaxima !== null && (
                                <>
                                  <div className="w-px h-12 bg-border" />
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Máx. Referência</p>
                                    <p className="text-2xl font-bold text-muted-foreground">
                                      {totalReferenciaMaxima.toFixed(2)}%
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {dentroDoLimite ? (
                                <>
                                  <CheckCircle className="w-6 h-6 text-green-500" />
                                  <span className="text-sm font-medium text-green-600">Dentro do limite</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-6 h-6 text-destructive" />
                                  <div className="text-right">
                                    <span className="text-sm font-medium text-destructive block">Acima do limite</span>
                                    <Badge variant="destructive" className="text-xs">
                                      +{diferencaPercentual.toFixed(1)}% acima
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Grid de Semanas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      {mortalidadePorSemana.filter(m => m.dia <= Math.max(diasDesdeAlojamento + 7, 7)).map((m) => (
                        <div 
                          key={m.dia} 
                          className={`p-4 rounded-lg text-center ${
                            m.acima_limite ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground font-medium">Dia {m.dia}</p>
                          <p className={`text-lg font-bold ${m.acima_limite ? 'text-destructive' : ''}`}>
                            {m.quantidade_mortes.toLocaleString('pt-BR')}
                          </p>
                          <p className={`text-sm ${m.acima_limite ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {m.mortalidade_real.toFixed(2)}%
                          </p>
                          {m.mortalidade_referencia !== null && (
                            <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-border/50">
                              {m.acima_limite ? (
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                              ) : (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                Ref: {m.mortalidade_referencia.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                        const metaDia = [0, 7, 14, 21, 28, 35, 42].reduce((prev, curr) =>
                          Math.abs(curr - p.dia) < Math.abs(prev - p.dia) ? curr : prev
                        );
                        const metaValue = editingMetas ? (editingMetas as any)[`meta_${metaDia}_dias_kg`] || editingMetas.peso_inicial_kg : 0;
                        const diff = metaValue > 0 ? ((p.peso_real_kg - metaValue) / metaValue) * 100 : 0;
                        const refData = desempenhoReferencia.find(d => d.dia === p.dia);
                        
                        return (
                          <div 
                            key={index} 
                            className="p-4 rounded-lg bg-muted/50 text-center cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => {
                              setPesagemSelecionada({
                                dataPesagem: p.data_pesagem,
                                dia: p.dia,
                                pesoReferencia: refData ? refData.peso_g / 1000 : undefined
                              });
                            }}
                          >
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
                            {p.numSessoes > 1 && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {p.numSessoes} sessões
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Dialog de detalhes da pesagem */}
      {pesagemSelecionada && (
        <PesagemDetalheDialog
          open={!!pesagemSelecionada}
          onOpenChange={(open) => !open && setPesagemSelecionada(null)}
          dataPesagem={pesagemSelecionada.dataPesagem}
          loteId={loteId!}
          dia={pesagemSelecionada.dia}
          pesoReferencia={pesagemSelecionada.pesoReferencia}
        />
      )}
    </div>
  );
}
