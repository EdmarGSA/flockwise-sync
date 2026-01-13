import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { Target, TrendingUp, Scale, Skull, AlertTriangle, CheckCircle } from 'lucide-react';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem: string;
  sexo: string;
  peso_medio_pintinhos: number | null;
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

interface PesagemData {
  dia: number;
  peso_real_kg: number;
}

interface DesempenhoReferencia {
  dia: number;
  peso_g: number;
}

interface MortalidadePorSemana {
  dia: number;
  mortalidade_real: number;
  mortalidade_referencia: number | null;
  acima_limite: boolean;
}

interface MetasVetTabProps {
  loteId: string;
  lote: Lote;
}

export default function MetasVetTab({ loteId, lote }: MetasVetTabProps) {
  const { user } = useAuth();
  const { integradoId } = useIntegradoId();
  const [metas, setMetas] = useState<MetasPeso | null>(null);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [desempenhoReferencia, setDesempenhoReferencia] = useState<DesempenhoReferencia[]>([]);
  const [mortalidadePorSemana, setMortalidadePorSemana] = useState<MortalidadePorSemana[]>([]);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState(0);
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
      .select('dia, peso_g')
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
          data_pesagem,
          pesagem_itens (quantidade_aves, peso_liquido_g)
        `)
        .eq('lote_id', loteId)
        .order('data_pesagem', { ascending: true });

      if (pesagensData) {
        // Agrupar pesagens parciais do mesmo dia
        const pesagensPorData = pesagensData.reduce((acc: Record<string, any[]>, p: any) => {
          const data = p.data_pesagem;
          if (!acc[data]) acc[data] = [];
          acc[data].push(...p.pesagem_itens);
          return acc;
        }, {});

        // Calcular média ponderada consolidada por dia - Dia 1 = dia do alojamento
        const processed = Object.entries(pesagensPorData).map(([data, itens]) => {
          const totalAves = itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
          const totalPeso = itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_g || 0), 0);
          const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
          const dia = calcularIdadeNaData(lote.data_alojamento!, data);
          return { dia, peso_real_kg: pesoMedio };
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
        const dataAlojamento = new Date(lote.data_alojamento);
        const semanas = [7, 14, 21, 28, 35, 42, 49];
        
        const mortalidadeSemanal = semanas.map(dia => {
          let mortesAcumuladas = 0;
          mortalidadeData.forEach((m: any) => {
            // Dia 1 = dia do alojamento
            const diasDesdeMort = calcularIdadeNaData(lote.data_alojamento!, m.data_registro);
            if (diasDesdeMort <= dia) {
              mortesAcumuladas += m.mortalidade_itens.reduce((acc: number, item: any) => acc + item.quantidade, 0);
            }
          });

          const mortalidadeReal = (mortesAcumuladas / qtdAlojada) * 100;
          
          const refKeys: Record<number, string> = {
            7: 'mortalidade_7_dias',
            14: 'mortalidade_14_dias',
            21: 'mortalidade_21_dias',
            28: 'mortalidade_28_dias',
            35: 'mortalidade_35_dias',
            42: 'mortalidade_42_dias',
            49: 'mortalidade_acima_42_dias',
          };
          const refValue = mortalidadeMediaData ? Number((mortalidadeMediaData as any)[refKeys[dia]]) : null;

          return {
            dia,
            mortalidade_real: mortalidadeReal,
            mortalidade_referencia: refValue,
            acima_limite: refValue !== null && mortalidadeReal > refValue,
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

  // Mortalidade chart
  const mortalidadeChartData = mortalidadePorSemana.map(m => ({
    dia: m.dia,
    real: m.mortalidade_real,
    referencia: m.mortalidade_referencia,
  }));

  const alertasMortalidade = mortalidadePorSemana.filter(m => m.acima_limite && m.dia <= diasLote);

  // Total mortalidade
  const totalMortalidadeReal = mortalidadePorSemana.find(m => m.dia >= diasLote)?.mortalidade_real || 0;
  const totalMortalidadeRef = mortalidadePorSemana
    .filter(m => m.dia <= diasLote)
    .reduce((acc, m) => acc + (m.mortalidade_referencia || 0), 0);

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
                  Mortalidade acima do limite em: {alertasMortalidade.map(a => `Dia ${a.dia}`).join(', ')}
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
    </div>
  );
}
