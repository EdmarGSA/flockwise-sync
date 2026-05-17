import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Target, TrendingUp, Scale, Skull, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MortalidadeSemanaDetalheDialog from '@/components/lotes/MortalidadeSemanaDetalheDialog';
interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem: string;
  sexo: string;
  peso_medio_pintinhos_kg: number | null;
}

interface MetasPeso {
  peso_inicial_kg: number;
  meta_7_dias_kg: number;
  meta_14_dias_kg: number;
  meta_21_dias_kg: number;
  meta_28_dias_kg: number;
  meta_35_dias_kg: number;
  meta_42_dias_kg: number;
  gpd_kg: number;
}

export interface PesagemData {
  dia: number;
  peso_real_kg: number;
  data_pesagem: string;
  numSessoes: number;
  totalAves: number;
  totalPesoKg: number;
}

interface DesempenhoReferencia {
  dia: number;
  peso_kg: number;
}

interface MortalidadePorSemana {
  semana: number;
  diaInicio: number;
  diaFim: number;
  mortalidade_semana: number;
  mortalidade_referencia: number;
  quantidade_mortes_semana: number;
  acima_limite: boolean;
}

interface SemanaSelecionada {
  semana: number;
  diaInicio: number;
  diaFim: number;
  metaSemana: number;
}

interface MetasVetTabProps {
  loteId: string;
  lote: Lote;
  onPesagemClick?: (pesagem: PesagemData, pesoReferencia?: number) => void;
}



export default function MetasVetTab({ loteId, lote, onPesagemClick }: MetasVetTabProps) {
  const { user } = useAuth();
  const { integradoId } = useIntegradoId();
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [mortalidadePorSemana, setMortalidadePorSemana] = useState<MortalidadePorSemana[]>([]);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState(0);
  const [semanaSelecionada, setSemanaSelecionada] = useState<SemanaSelecionada | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (integradoId) {
      fetchData();
    }
  }, [loteId, integradoId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch recebimento for quantidade alojada
    const { data: recebimentoData } = await supabase
      .from('recebimento_lotes')
      .select('quantidade_mortos, quantidade_eliminados, quantidade_eliminados_classificacao, quantidade_eliminados_locomotor')
      .eq('lote_id', loteId)
      .maybeSingle();

    let qtdAlojada = lote.quantidade_aves;
    if (recebimentoData) {
      const eliminadosTotal = (recebimentoData.quantidade_mortos || 0) + 
                             (recebimentoData.quantidade_eliminados || 0) + 
                             (recebimentoData.quantidade_eliminados_classificacao || 0) + 
                             (recebimentoData.quantidade_eliminados_locomotor || 0);
      qtdAlojada = lote.quantidade_aves - eliminadosTotal;
    }
    setQuantidadeAlojada(qtdAlojada);

    // Fetch metas
    const { data: metasData } = await supabase
      .from('metas_peso')
      .select('*')
      .eq('lote_id', loteId)
      .maybeSingle();

    if (metasData) {
      setMetas({
        peso_inicial_kg: Number(metasData.peso_inicial_kg),
        meta_7_dias_kg: Number(metasData.meta_7_dias_kg),
        meta_14_dias_kg: Number(metasData.meta_14_dias_kg),
        meta_21_dias_kg: Number(metasData.meta_21_dias_kg),
        meta_28_dias_kg: Number(metasData.meta_28_dias_kg),
        meta_35_dias_kg: Number(metasData.meta_35_dias_kg),
        meta_42_dias_kg: Number(metasData.meta_42_dias_kg),
        gpd_kg: Number(metasData.gpd_kg),
      });
    }

    // Fetch desempenho referencia
    const { data: desempenhoData } = await supabase
      .from('desempenho_aves')
      .select('dia, peso_kg')
      .eq('linhagem', lote.linhagem as 'cobb_500' | 'ross_308' | 'hubbard')
      .eq('sexo', lote.sexo as 'macho' | 'femea' | 'misto')
      .order('dia', { ascending: true });

    if (desempenhoData) {
      setDesempenhoReferencia(desempenhoData);
    }

    // Fetch pesagens
    if (lote.data_alojamento) {
      const { data: pesagensData } = await supabase
        .from('pesagens')
        .select(`
          id,
          data_pesagem,
          pesagem_itens (quantidade_aves, peso_liquido_kg)
        `)
        .eq('lote_id', loteId)
        .order('data_pesagem', { ascending: true });

      if (pesagensData) {
        // Agrupar pesagens parciais do mesmo dia
        const pesagensPorData = pesagensData.reduce((acc: Record<string, { itens: any[], sessoes: Set<string> }>, p: any) => {
          const data = p.data_pesagem;
          if (!acc[data]) acc[data] = { itens: [], sessoes: new Set() };
          acc[data].itens.push(...p.pesagem_itens);
          acc[data].sessoes.add(p.id);
          return acc;
        }, {});

        // Calcular média ponderada consolidada por dia - Dia 1 = dia do alojamento
        const processed = Object.entries(pesagensPorData).map(([data, { itens, sessoes }]) => {
          const totalAves = itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
          const totalPeso = itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_kg || 0), 0);
          const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
          const dia = calcularIdadeNaData(lote.data_alojamento!, data);
          return { 
            dia, 
            peso_real_kg: pesoMedio,
            data_pesagem: data,
            numSessoes: sessoes.size,
            totalAves: totalAves,
            totalPesoKg: totalPeso
          };
        }).sort((a, b) => a.dia - b.dia);
        
        setPesagens(processed);
      }
    }

    // Fetch mortalidade
    if (lote.data_alojamento && qtdAlojada > 0 && integradoId) {
      // Primeiro tenta buscar específico para linhagem + sexo
      let mortalidadeMediaData = null;
      
      const { data: mortalidadeEspecifica } = await supabase
        .from('mortalidade_media')
        .select('*')
        .eq('integrado_id', integradoId)
        .eq('linhagem', lote.linhagem as 'cobb_500' | 'ross_308' | 'hubbard')
        .eq('sexo', lote.sexo as 'macho' | 'femea' | 'misto')
        .maybeSingle();
      
      if (mortalidadeEspecifica) {
        mortalidadeMediaData = mortalidadeEspecifica;
      } else {
        // Fallback: buscar linhagem + misto
        const { data: mortalidadeMisto } = await supabase
          .from('mortalidade_media')
          .select('*')
          .eq('integrado_id', integradoId)
          .eq('linhagem', lote.linhagem as 'cobb_500' | 'ross_308' | 'hubbard')
          .eq('sexo', 'misto')
          .maybeSingle();
        
        mortalidadeMediaData = mortalidadeMisto;
      }

      const { data: mortalidadeData } = await supabase
        .from('mortalidade')
        .select(`data_registro, mortalidade_itens(quantidade)`)
        .eq('lote_id', loteId);

      if (mortalidadeData) {
        // Definir semanas com início e fim
        const semanasConfig = [
          { semana: 1, diaInicio: 1, diaFim: 7 },
          { semana: 2, diaInicio: 8, diaFim: 14 },
          { semana: 3, diaInicio: 15, diaFim: 21 },
          { semana: 4, diaInicio: 22, diaFim: 28 },
          { semana: 5, diaInicio: 29, diaFim: 35 },
          { semana: 6, diaInicio: 36, diaFim: 42 },
          { semana: 7, diaInicio: 43, diaFim: 49 },
        ];

        // Metas acumuladas de referência
        const metasAcumuladas = mortalidadeMediaData ? [
          0,
          Number(mortalidadeMediaData.mortalidade_7_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_14_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_21_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_28_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_35_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_42_dias) || 0,
          Number(mortalidadeMediaData.mortalidade_acima_42_dias) || 0,
        ] : [];
        
        const mortalidadeSemanal: MortalidadePorSemana[] = semanasConfig.map((config) => {
          let mortesSemana = 0;
          mortalidadeData.forEach((m: any) => {
            const diaMorte = calcularIdadeNaData(lote.data_alojamento!, m.data_registro);
            if (diaMorte >= config.diaInicio && diaMorte <= config.diaFim) {
              mortesSemana += m.mortalidade_itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
            }
          });

          const mortalidadeSemana = (mortesSemana / qtdAlojada) * 100;
          const metaAtual = metasAcumuladas[config.semana] || 0;
          const metaAnterior = metasAcumuladas[config.semana - 1] || 0;
          const metaSemana = metaAtual - metaAnterior;

          return {
            semana: config.semana,
            diaInicio: config.diaInicio,
            diaFim: config.diaFim,
            mortalidade_semana: mortalidadeSemana,
            mortalidade_referencia: metaSemana,
            quantidade_mortes_semana: mortesSemana,
            acima_limite: metaSemana > 0 && mortalidadeSemana > metaSemana,
          };
        });

        setMortalidadePorSemana(mortalidadeSemanal);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando dados de desempenho...
        </CardContent>
      </Card>
    );
  }

  const diasLote = lote.data_alojamento 
    ? calcularIdadeLote(lote.data_alojamento)
    : 0;

  // Chart data for peso
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
      meta: metas ? metas[metaKeys[dia]] || 0 : 0,
      referencia: refData ? refData.peso_kg : undefined,
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
        referencia: refData ? refData.peso_kg : undefined,
      } as any);
    }
  });
  chartData.sort((a, b) => a.dia - b.dia);

  // Mortalidade chart (convertido para acumulado)
  const mortalidadeChartData = mortalidadePorSemana.map((m, idx) => {
    const mortalidadeAcumulada = mortalidadePorSemana.slice(0, idx + 1).reduce((acc, s) => acc + s.mortalidade_semana, 0);
    const referenciaAcumulada = mortalidadePorSemana.slice(0, idx + 1).reduce((acc, s) => acc + s.mortalidade_referencia, 0);
    return {
      dia: m.diaFim,
      real: mortalidadeAcumulada,
      referencia: referenciaAcumulada,
    };
  });

  const alertasMortalidade = mortalidadePorSemana.filter(m => m.acima_limite && m.diaFim <= diasLote);

  // Total mortalidade
  const totalMortalidadeReal = mortalidadePorSemana.reduce((acc, m) => acc + m.mortalidade_semana, 0);
  const totalMortalidadeRef = mortalidadePorSemana.reduce((acc, m) => acc + m.mortalidade_referencia, 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alertasMortalidade.length > 0 && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Alerta de Mortalidade</p>
                <p className="text-sm text-muted-foreground">
                  Mortalidade acima do limite em: {alertasMortalidade.map(a => `Semana ${a.semana}`).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-primary/50" />
              <div>
                <p className="text-muted-foreground text-sm">Último Peso</p>
                <p className="text-xl font-bold">
                  {pesagens.length > 0 
                    ? `${pesagens[pesagens.length - 1].peso_real_kg.toFixed(3)} kg`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-500/50" />
              <div>
                <p className="text-muted-foreground text-sm">GPD Esperado</p>
                <p className="text-xl font-bold">
                  {metas ? `${(metas.gpd_kg * 1000).toFixed(1)} g/dia` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border ${totalMortalidadeReal > totalMortalidadeRef ? 'bg-destructive/10 border-destructive' : 'bg-card border-border'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Skull className={`w-8 h-8 ${totalMortalidadeReal > totalMortalidadeRef ? 'text-destructive' : 'text-muted-foreground/50'}`} />
              <div>
                <p className="text-muted-foreground text-sm">Mortalidade</p>
                <p className="text-xl font-bold">
                  {totalMortalidadeReal.toFixed(2)}%
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (ref: {totalMortalidadeRef.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peso Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Evolução de Peso
          </CardTitle>
          <CardDescription>Comparação entre peso real, meta e referência da linhagem</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="dia" 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Dias', position: 'bottom', offset: -5 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(3)} kg`,
                    name === 'meta' ? 'Meta' : name === 'referencia' ? 'Referência' : 'Real'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="referencia" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  name="Referência"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="meta" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Meta"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="real" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Real"
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de pesagem disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mortalidade Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-muted-foreground" />
            Mortalidade Acumulada
          </CardTitle>
          <CardDescription>Comparação com referência de mortalidade esperada</CardDescription>
        </CardHeader>
        <CardContent>
          {mortalidadeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={mortalidadeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="dia" 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Dias', position: 'bottom', offset: -5 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}%`,
                    name === 'referencia' ? 'Referência' : 'Real'
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="referencia" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  name="Referência"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="real" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Real"
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de mortalidade disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico Mortalidade por Semana - Cards Clicáveis */}
      {mortalidadePorSemana.length > 0 && (
        <Card className="bg-card border-border">
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
              const totalMortalidadeRealCalc = mortalidadePorSemana.reduce((acc, m) => acc + m.mortalidade_semana, 0);
              const totalQuantidadeMortes = mortalidadePorSemana.reduce((acc, m) => acc + m.quantidade_mortes_semana, 0);
              const totalReferenciaMaxima = mortalidadePorSemana.reduce((acc, m) => acc + m.mortalidade_referencia, 0);
              const dentroDoLimite = totalMortalidadeRealCalc <= totalReferenciaMaxima;
              const diferencaPercentual = totalReferenciaMaxima > 0
                ? ((totalMortalidadeRealCalc - totalReferenciaMaxima) / totalReferenciaMaxima) * 100
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
                          {totalMortalidadeRealCalc.toFixed(2)}%
                        </p>
                      </div>
                      
                      <div className="w-px h-12 bg-border" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Máx. Referência</p>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {totalReferenciaMaxima.toFixed(2)}%
                        </p>
                      </div>
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

            {/* Grid de Semanas - Cards Clicáveis */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {mortalidadePorSemana.filter(m => m.diaFim <= Math.max(diasLote + 7, 7)).map((m) => (
                <div 
                  key={m.semana}
                  onClick={() => lote?.data_alojamento && setSemanaSelecionada({
                    semana: m.semana,
                    diaInicio: m.diaInicio,
                    diaFim: m.diaFim,
                    metaSemana: m.mortalidade_referencia,
                  })}
                  className={`p-4 rounded-lg text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                    m.acima_limite ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <p className="text-xs text-muted-foreground font-medium">Semana {m.semana}</p>
                  <p className="text-[10px] text-muted-foreground">(Dias {m.diaInicio}-{m.diaFim})</p>
                  <p className={`text-lg font-bold ${m.acima_limite ? 'text-destructive' : ''}`}>
                    {m.quantidade_mortes_semana.toLocaleString('pt-BR')}
                  </p>
                  <p className={`text-sm ${m.acima_limite ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {m.mortalidade_semana.toFixed(2)}%
                  </p>
                  {m.mortalidade_referencia > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-border/50">
                      {m.acima_limite ? (
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Meta: {m.mortalidade_referencia.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Pesagens - Cards Clicáveis */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Histórico de Pesagens
          </CardTitle>
          <CardDescription>Clique em um dia para ver os detalhes das pesagens</CardDescription>
        </CardHeader>
        <CardContent>
          {pesagens.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pesagens.slice().reverse().map((pesagem) => {
                const refData = desempenhoReferencia.find(d => d.dia === pesagem.dia);
                const pesoRefKg = refData ? refData.peso_kg : null;
                const diferenca = pesoRefKg 
                  ? ((pesagem.peso_real_kg - pesoRefKg) / pesoRefKg) * 100 
                  : null;
                
                const dataFormatada = format(
                  new Date(pesagem.data_pesagem + 'T12:00:00'), 
                  "dd/MM", 
                  { locale: ptBR }
                );

                return (
                  <button
                    key={pesagem.data_pesagem}
                    onClick={() => {
                      const pesoRef = desempenhoReferencia.find(d => d.dia === pesagem.dia)?.peso_kg;
                      onPesagemClick?.(pesagem, pesoRef ?? undefined);
                    }}
                    className="flex flex-col p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Dia {pesagem.dia}</span>
                      {pesagem.numSessoes > 1 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {pesagem.numSessoes}x
                        </Badge>
                      )}
                    </div>
                    <span className="font-bold text-base">
                      {pesagem.peso_real_kg.toFixed(3)} kg
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{pesagem.totalAves} aves</span>
                      <span>•</span>
                      <span>{pesagem.totalPesoKg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{dataFormatada}</span>
                      {diferenca !== null && (
                        <Badge 
                          variant={diferenca >= 0 ? "default" : "destructive"} 
                          className="text-xs h-5 px-1.5"
                        >
                          {diferenca >= 0 ? '+' : ''}{diferenca.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 self-end opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma pesagem registrada
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes da mortalidade por semana */}
      {semanaSelecionada && lote.data_alojamento && (
        <MortalidadeSemanaDetalheDialog
          open={!!semanaSelecionada}
          onOpenChange={(open) => !open && setSemanaSelecionada(null)}
          loteId={loteId}
          semana={semanaSelecionada.semana}
          diaInicio={semanaSelecionada.diaInicio}
          diaFim={semanaSelecionada.diaFim}
          dataAlojamento={lote.data_alojamento}
          metaSemana={semanaSelecionada.metaSemana}
          quantidadeAlojada={quantidadeAlojada}
        />
      )}
    </div>
  );
}
