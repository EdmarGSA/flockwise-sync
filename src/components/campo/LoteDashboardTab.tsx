import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TachometerGauge } from '@/components/cockpit/TachometerGauge';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { format, addDays } from 'date-fns';
import { calcularIdadeLote } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { Skull, Wheat, TrendingUp, Pill, CalendarCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type LoteRow = Database['public']['Tables']['lotes']['Row'];

interface LoteDashboardTabProps {
  loteId: string;
  lote: LoteRow;
}

interface MetasZootecnicas {
  mortalidade_ok: number;
  mortalidade_alerta: number;
  ca_ok: number;
  ca_alerta: number;
  consumo_min: number;
  consumo_max: number;
  carencia_medicamento_minimo: number;
}

interface Pesagem {
  dia: number;
  peso_kg: number;
}

export function LoteDashboardTab({ loteId, lote }: LoteDashboardTabProps) {
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState<MetasZootecnicas | null>(null);
  const [mortalidadeTotal, setMortalidadeTotal] = useState(0);
  const [consumoTotalKg, setConsumoTotalKg] = useState(0);
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [ultimoTratamentoDias, setUltimoTratamentoDias] = useState<number | null>(null);
  const [carenciaTratamento, setCarenciaTratamento] = useState(0);
  const [metaPesoSaida, setMetaPesoSaida] = useState<number>(0);

  const diasAlojados = useMemo(() => {
    return calcularIdadeLote(lote.data_alojamento);
  }, [lote.data_alojamento]);

  const avesAlojadas = lote.quantidade_aves;
  const avesVivas = avesAlojadas - mortalidadeTotal;

  // Determine period bucket (7, 14, 21, 28, 35, 42)
  const periodoBucket = useMemo(() => {
    if (diasAlojados <= 7) return 7;
    if (diasAlojados <= 14) return 14;
    if (diasAlojados <= 21) return 21;
    if (diasAlojados <= 28) return 28;
    if (diasAlojados <= 35) return 35;
    return 42;
  }, [diasAlojados]);

  useEffect(() => {
    if (integradoId && loteId) {
      fetchData();
    }
  }, [integradoId, loteId]);

  const fetchData = async () => {
    if (!integradoId) return;
    setLoading(true);

    try {
      // Fetch metas zootecnicas
      const { data: metasData } = await supabase
        .from('metas_zootecnicas')
        .select('*')
        .eq('integrado_id', integradoId)
        .single();

      if (metasData) {
        // Build metas object based on current period
        const suffix = `_${periodoBucket}_dias` as const;
        setMetas({
          mortalidade_ok: Number(metasData[`mortalidade${suffix}_ok` as keyof typeof metasData]) || 2,
          mortalidade_alerta: Number(metasData[`mortalidade${suffix}_alerta` as keyof typeof metasData]) || 3,
          ca_ok: Number(metasData[`ca${suffix}_ok` as keyof typeof metasData]) || 1.5,
          ca_alerta: Number(metasData[`ca${suffix}_alerta` as keyof typeof metasData]) || 1.8,
          consumo_min: Number(metasData[`consumo${suffix}_min` as keyof typeof metasData]) || 100,
          consumo_max: Number(metasData[`consumo${suffix}_max` as keyof typeof metasData]) || 180,
          carencia_medicamento_minimo: metasData.carencia_medicamento_minimo || 7,
        });
      } else {
        // Default values
        setMetas({
          mortalidade_ok: 2,
          mortalidade_alerta: 3.5,
          ca_ok: 1.55,
          ca_alerta: 1.75,
          consumo_min: 100,
          consumo_max: 180,
          carencia_medicamento_minimo: 7,
        });
      }

      // Fetch mortality
      const { data: mortalidadeData } = await supabase
        .from('mortalidade')
        .select('id, mortalidade_itens(quantidade)')
        .eq('lote_id', loteId);

      let totalMort = 0;
      mortalidadeData?.forEach((m: any) => {
        m.mortalidade_itens?.forEach((item: any) => {
          totalMort += item.quantidade || 0;
        });
      });
      setMortalidadeTotal(totalMort);

      // Fetch total consumption from historico_nivel_silo (ração enviada ao lote)
      // For now, estimate based on desempenho_aves table
      const { data: desempenhoData } = await supabase
        .from('desempenho_aves')
        .select('consumo_acumulado_racao_g')
        .eq('linhagem', lote.linhagem || 'cobb_500')
        .eq('sexo', lote.sexo || 'misto')
        .eq('dia', diasAlojados)
        .limit(1);

      if (desempenhoData && desempenhoData.length > 0) {
        // Estimate: consumo_acumulado * aves_vivas / 1000
        const consumoEstimado = (desempenhoData[0].consumo_acumulado_racao_g * avesVivas) / 1000;
        setConsumoTotalKg(consumoEstimado);
      }

      // Fetch pesagens
      const { data: pesagensData } = await supabase
        .from('pesagens')
        .select('data_pesagem, pesagem_itens(quantidade_aves, peso_liquido_g)')
        .eq('lote_id', loteId)
        .order('data_pesagem', { ascending: true });

      const pesagensProcessed: Pesagem[] = [];
      pesagensData?.forEach((p: any) => {
        if (p.pesagem_itens && lote.data_alojamento) {
          let totalAves = 0;
          let totalPeso = 0;
          p.pesagem_itens.forEach((item: any) => {
            totalAves += item.quantidade_aves || 0;
            totalPeso += item.peso_liquido_g || 0;
          });
          if (totalAves > 0) {
            pesagensProcessed.push({
              dia: differenceInDays(new Date(p.data_pesagem), new Date(lote.data_alojamento)),
              peso_kg: totalPeso / totalAves,
            });
          }
        }
      });
      setPesagens(pesagensProcessed);

      // Fetch metas_peso for target weight
      const { data: metaPeso } = await supabase
        .from('metas_peso')
        .select('meta_42_dias_kg')
        .eq('lote_id', loteId)
        .single();

      setMetaPesoSaida(metaPeso?.meta_42_dias_kg || 2.9);

      // Fetch last treatment from tratamentos_lote
      const { data: tratamentosData } = await supabase
        .from('tratamentos_lote')
        .select('data_inicio, carencia_dias')
        .eq('lote_id', loteId)
        .order('data_inicio', { ascending: false })
        .limit(1);

      if (tratamentosData && tratamentosData.length > 0) {
        const diasDesde = differenceInDays(new Date(), new Date(tratamentosData[0].data_inicio));
        setUltimoTratamentoDias(diasDesde);
        setCarenciaTratamento(tratamentosData[0].carencia_dias || 7);
      } else {
        setUltimoTratamentoDias(null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate indicators
  const mortalidadePercent = avesAlojadas > 0 ? (mortalidadeTotal / avesAlojadas) * 100 : 0;
  
  const consumoGAvesDia = useMemo(() => {
    if (diasAlojados <= 0 || avesVivas <= 0) return 0;
    return (consumoTotalKg * 1000) / avesVivas / diasAlojados;
  }, [consumoTotalKg, avesVivas, diasAlojados]);

  const ultimoPesoKg = useMemo(() => {
    if (pesagens.length === 0) return lote.peso_medio_pintinhos || 0.042;
    return pesagens[pesagens.length - 1].peso_kg;
  }, [pesagens, lote.peso_medio_pintinhos]);

  const conversaoAlimentar = useMemo(() => {
    if (ultimoPesoKg <= 0 || avesVivas <= 0) return 0;
    const massaTotal = ultimoPesoKg * avesVivas;
    return massaTotal > 0 ? consumoTotalKg / massaTotal : 0;
  }, [consumoTotalKg, ultimoPesoKg, avesVivas]);

  // Exit prediction
  const previsaoSaida = useMemo(() => {
    if (pesagens.length < 2) {
      return { dataEstimada: null, diasRestantes: null, progresso: 0, confianca: 0 };
    }

    // Calculate GPD via linear regression
    const n = pesagens.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    pesagens.forEach(p => {
      sumX += p.dia;
      sumY += p.peso_kg;
      sumXY += p.dia * p.peso_kg;
      sumX2 += p.dia * p.dia;
    });

    const gpd = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (gpd <= 0) {
      return { dataEstimada: null, diasRestantes: null, progresso: 0, confianca: 0 };
    }

    const pesoFaltante = metaPesoSaida - ultimoPesoKg;
    const diasParaMeta = Math.ceil(pesoFaltante / gpd);
    
    const progresso = Math.min((ultimoPesoKg / metaPesoSaida) * 100, 100);
    const dataEstimada = lote.data_alojamento 
      ? addDays(new Date(lote.data_alojamento), diasAlojados + diasParaMeta)
      : null;

    // Simple confidence based on R² approximation
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    const intercept = (sumY - gpd * sumX) / n;
    pesagens.forEach(p => {
      ssTot += Math.pow(p.peso_kg - meanY, 2);
      const predicted = intercept + gpd * p.dia;
      ssRes += Math.pow(p.peso_kg - predicted, 2);
    });
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const confianca = Math.round(r2 * 100);

    return { dataEstimada, diasRestantes: diasParaMeta, progresso, confianca };
  }, [pesagens, ultimoPesoKg, metaPesoSaida, lote.data_alojamento, diasAlojados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getMedicamentoStatus = () => {
    if (ultimoTratamentoDias === null) {
      return { status: 'ok', label: 'Sem tratamentos', color: 'text-chart-2' };
    }
    if (ultimoTratamentoDias >= carenciaTratamento) {
      return { status: 'ok', label: 'Carência OK', color: 'text-chart-2' };
    }
    return { 
      status: 'alerta', 
      label: `${carenciaTratamento - ultimoTratamentoDias}d restantes`, 
      color: 'text-destructive' 
    };
  };

  const medicamentoStatus = getMedicamentoStatus();

  return (
    <div className="space-y-6">
      {/* Info header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Dia {diasAlojados} de produção</span>
        <span>{avesVivas.toLocaleString('pt-BR')} aves vivas</span>
      </div>

      {/* Gauges Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Mortalidade */}
        <Card className="bg-card">
          <CardContent className="pt-4 flex flex-col items-center">
            <TachometerGauge
              value={mortalidadePercent}
              max={metas?.mortalidade_alerta ? metas.mortalidade_alerta * 1.5 : 6}
              zones={{ green: metas?.mortalidade_ok || 2, yellow: metas?.mortalidade_alerta || 3.5 }}
              title="Mortalidade"
              unit="%"
              decimals={2}
            />
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Skull className="w-3 h-3" />
              <span>{mortalidadeTotal.toLocaleString('pt-BR')} aves</span>
            </div>
          </CardContent>
        </Card>

        {/* Consumo */}
        <Card className="bg-card">
          <CardContent className="pt-4 flex flex-col items-center">
            <TachometerGauge
              value={consumoGAvesDia}
              max={metas?.consumo_max ? metas.consumo_max * 1.3 : 250}
              zones={{ green: metas?.consumo_max || 180, yellow: metas?.consumo_max ? metas.consumo_max * 1.15 : 210 }}
              title="Consumo"
              unit="g/ave/dia"
              decimals={0}
            />
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Wheat className="w-3 h-3" />
              <span>{consumoTotalKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg total</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversão Alimentar */}
        <Card className="bg-card">
          <CardContent className="pt-4 flex flex-col items-center">
            <TachometerGauge
              value={conversaoAlimentar}
              max={metas?.ca_alerta ? metas.ca_alerta * 1.3 : 2.5}
              zones={{ green: metas?.ca_ok || 1.55, yellow: metas?.ca_alerta || 1.75 }}
              title="CA"
              unit=""
              decimals={2}
            />
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>Peso: {ultimoPesoKg.toFixed(3)} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* Medicamento */}
        <Card className="bg-card">
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
                medicamentoStatus.status === 'ok' ? 'border-chart-2' : 'border-destructive'
              }`}>
                <Pill className={`w-8 h-8 ${medicamentoStatus.color}`} />
              </div>
              <span className="text-sm font-medium mt-2">Medicamento</span>
              <Badge variant={medicamentoStatus.status === 'ok' ? 'default' : 'destructive'} className="mt-1">
                {medicamentoStatus.label}
              </Badge>
              {ultimoTratamentoDias !== null && (
                <span className="text-xs text-muted-foreground mt-1">
                  {ultimoTratamentoDias}d desde tratamento
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exit Prediction Card */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Previsão de Saída
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pesagens.length < 2 ? (
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Necessário pelo menos 2 pesagens para projeção</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Peso Atual</span>
                  <p className="text-lg font-bold text-foreground">{ultimoPesoKg.toFixed(3)} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Meta Saída</span>
                  <p className="text-lg font-bold text-foreground">{metaPesoSaida.toFixed(2)} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Estimada</span>
                  <p className="text-lg font-bold text-primary">
                    {previsaoSaida.dataEstimada 
                      ? format(previsaoSaida.dataEstimada, 'dd/MM', { locale: ptBR })
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dias Restantes</span>
                  <p className="text-lg font-bold text-foreground">
                    {previsaoSaida.diasRestantes ?? '-'} dias
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Evolução do peso</span>
                  <span className="font-medium">{previsaoSaida.progresso.toFixed(1)}%</span>
                </div>
                <Progress value={previsaoSaida.progresso} className="h-3" />
              </div>

              {previsaoSaida.confianca > 0 && (
                <div className="flex justify-end">
                  <Badge variant="outline" className="text-xs">
                    Confiança: {previsaoSaida.confianca}%
                  </Badge>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
