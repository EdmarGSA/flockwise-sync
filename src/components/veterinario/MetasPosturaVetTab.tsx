import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Scale, TrendingUp, Egg, Skull, AlertTriangle } from 'lucide-react';
import { calcularIdadeLote, calcularIdadeNaData } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Lote {
  id: string;
  quantidade_aves: number;
  data_alojamento: string | null;
  linhagem_postura: string | null;
  sexo: string;
  peso_medio_pintinhos_kg: number | null;
}

interface DesempenhoPostura {
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
  producao_percentual: number;
  ovos_acumulados: number;
}

interface MetasPosturaVetTabProps {
  loteId: string;
  lote: Lote;
}

export default function MetasPosturaVetTab({ loteId, lote }: MetasPosturaVetTabProps) {
  const { user } = useAuth();
  const [desempenhoRef, setDesempenhoRef] = useState<DesempenhoPostura[]>([]);
  const [pesagens, setPesagens] = useState<PesagemData[]>([]);
  const [producaoData, setProducaoData] = useState<ProducaoData[]>([]);
  const [quantidadeAlojada, setQuantidadeAlojada] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('peso');

  useEffect(() => {
    fetchData();
  }, [loteId]);

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

    // Fetch desempenho referencia from desempenho_postura
    if (lote.linhagem_postura) {
      const { data: desempenhoData } = await supabase
        .from('desempenho_postura')
        .select('semana, peso_kg, consumo_diario_kg, producao_percentual, peso_ovo_g, ovos_ave_alojada, viabilidade_percentual, fase')
        .eq('linhagem', lote.linhagem_postura as any)
        .order('semana', { ascending: true });

      if (desempenhoData) {
        setDesempenhoRef(desempenhoData);
      }
    }

    // Fetch pesagens
    if (lote.data_alojamento) {
      const { data: pesagensData } = await supabase
        .from('pesagens')
        .select(`
          data_pesagem,
          pesagem_itens (quantidade_aves, peso_liquido_kg)
        `)
        .eq('lote_id', loteId)
        .order('data_pesagem', { ascending: true });

      if (pesagensData) {
        const processed = pesagensData.map((p: any) => {
          const totalAves = p.pesagem_itens.reduce((acc: number, item: any) => acc + item.quantidade_aves, 0);
          const totalPeso = p.pesagem_itens.reduce((acc: number, item: any) => acc + (item.peso_liquido_kg || 0), 0);
          const pesoMedio = totalAves > 0 ? totalPeso / totalAves : 0;
          const semana = Math.ceil(calcularIdadeNaData(lote.data_alojamento!, p.data_pesagem) / 7);
          return { semana, peso_real_g: pesoMedio };
        });
        setPesagens(processed);
      }

      // Fetch producao_ovos
      const { data: producaoOvosData } = await supabase
        .from('producao_ovos')
        .select('data_producao, total_ovos')
        .eq('lote_id', loteId)
        .order('data_producao', { ascending: true });

      if (producaoOvosData && qtdAlojada > 0) {
        // Group by week and calculate production percentage
        const producaoPorSemana: Record<number, { ovos: number; dias: number }> = {};
        let ovosAcumulados = 0;

        producaoOvosData.forEach((p: any) => {
          const semana = Math.ceil(calcularIdadeNaData(lote.data_alojamento!, p.data_producao) / 7);
          if (!producaoPorSemana[semana]) {
            producaoPorSemana[semana] = { ovos: 0, dias: 0 };
          }
          producaoPorSemana[semana].ovos += p.total_ovos || 0;
          producaoPorSemana[semana].dias += 1;
          ovosAcumulados += p.total_ovos || 0;
        });

        const producaoProcessed = Object.entries(producaoPorSemana).map(([semana, data]) => {
          // Calculate average daily production percentage for the week
          const producaoMedia = data.dias > 0 ? (data.ovos / data.dias / qtdAlojada) * 100 : 0;
          return {
            semana: parseInt(semana),
            producao_percentual: producaoMedia,
            ovos_acumulados: ovosAcumulados,
          };
        });

        setProducaoData(producaoProcessed.sort((a, b) => a.semana - b.semana));
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

  const semanasLote = lote.data_alojamento 
    ? Math.ceil(calcularIdadeLote(lote.data_alojamento) / 7)
    : 0;

  // Get current phase
  const getFase = (semana: number) => {
    if (semana <= 6) return 'cria';
    if (semana <= 18) return 'recria';
    return 'producao';
  };

  const faseAtual = getFase(semanasLote);

  // Last weight and reference
  const ultimoPeso = pesagens.length > 0 ? pesagens[pesagens.length - 1].peso_real_g : null;
  const pesoRefAtual = desempenhoRef.find(d => d.semana === semanasLote)?.peso_kg || null;

  // Current production (for production phase)
  const ultimaProducao = producaoData.length > 0 ? producaoData[producaoData.length - 1].producao_percentual : null;
  const producaoRefAtual = desempenhoRef.find(d => d.semana === semanasLote)?.producao_percentual || null;

  // Chart data for weight (all phases)
  const pesoChartData = desempenhoRef.slice(0, Math.min(semanasLote + 10, desempenhoRef.length)).map(d => {
    const pesagemReal = pesagens.find(p => p.semana === d.semana);
    return {
      semana: d.semana,
      referencia: d.peso_kg,
      real: pesagemReal?.peso_real_g || null,
    };
  });

  // Chart data for production (week 19+)
  const producaoChartData = desempenhoRef
    .filter(d => d.semana >= 19 && d.semana <= Math.max(semanasLote + 10, 40))
    .map(d => {
      const producaoReal = producaoData.find(p => p.semana === d.semana);
      return {
        semana: d.semana,
        referencia: d.producao_percentual || 0,
        real: producaoReal?.producao_percentual || null,
      };
    });

  // Viabilidade chart
  const viabilidadeChartData = desempenhoRef.slice(0, Math.min(semanasLote + 10, desempenhoRef.length)).map(d => ({
    semana: d.semana,
    referencia: d.viabilidade_percentual || 100,
  }));

  // Calculate total eggs
  const ovosAcumulados = producaoData.length > 0 ? producaoData[producaoData.length - 1].ovos_acumulados : 0;
  const ovosPorAveAlojada = quantidadeAlojada > 0 ? ovosAcumulados / quantidadeAlojada : 0;

  const formatLinhagem = (linhagem: string | null) => {
    if (!linhagem) return 'N/A';
    const labels: Record<string, string> = {
      lohmann_brown_lite: 'Lohmann Brown-Lite',
      lohmann_lsl_lite: 'Lohmann LSL Lite',
    };
    return labels[linhagem] || linhagem;
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{formatLinhagem(lote.linhagem_postura)}</Badge>
        <Badge variant="secondary">Semana {semanasLote}</Badge>
        <Badge className={
          faseAtual === 'cria' ? 'bg-blue-500' : 
          faseAtual === 'recria' ? 'bg-amber-500' : 
          'bg-green-500'
        }>
          {faseAtual === 'cria' ? 'Cria' : faseAtual === 'recria' ? 'Recria' : 'Produção'}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-primary/50" />
              <div>
                <p className="text-muted-foreground text-sm">Último Peso</p>
                <p className="text-xl font-bold">
                  {ultimoPeso ? `${ultimoPeso.toFixed(0)} g` : 'N/A'}
                </p>
                {pesoRefAtual && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {pesoRefAtual.toFixed(0)} g
                    {ultimoPeso && (
                      <span className={ultimoPeso >= pesoRefAtual ? 'text-green-500 ml-2' : 'text-destructive ml-2'}>
                        ({((ultimoPeso / pesoRefAtual - 1) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {faseAtual === 'producao' ? (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Egg className="w-8 h-8 text-amber-500/50" />
                <div>
                  <p className="text-muted-foreground text-sm">% Postura</p>
                  <p className="text-xl font-bold">
                    {ultimaProducao ? `${ultimaProducao.toFixed(1)}%` : 'N/A'}
                  </p>
                  {producaoRefAtual && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {producaoRefAtual.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-500/50" />
                <div>
                  <p className="text-muted-foreground text-sm">Fase Atual</p>
                  <p className="text-xl font-bold capitalize">{faseAtual}</p>
                  <p className="text-xs text-muted-foreground">
                    Produção inicia semana 19
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Egg className="w-8 h-8 text-primary/50" />
              <div>
                <p className="text-muted-foreground text-sm">Ovos/Ave Alojada</p>
                <p className="text-xl font-bold">
                  {ovosPorAveAlojada.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: {ovosAcumulados.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="peso">Peso</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="viabilidade">Viabilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="peso">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Evolução de Peso
              </CardTitle>
              <CardDescription>Peso real vs referência da linhagem (por semana)</CardDescription>
            </CardHeader>
            <CardContent>
              {pesoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={pesoChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="semana" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Semanas', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Peso (g)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value?.toFixed(0)} g`,
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
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Real"
                      dot={{ fill: '#22c55e', strokeWidth: 2 }}
                      connectNulls
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
        </TabsContent>

        <TabsContent value="producao">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Egg className="w-5 h-5 text-amber-500" />
                Curva de Produção
              </CardTitle>
              <CardDescription>% Postura real vs referência (semana 19+)</CardDescription>
            </CardHeader>
            <CardContent>
              {semanasLote >= 19 && producaoChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={producaoChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="semana" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Semanas', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      domain={[0, 100]}
                      label={{ value: '% Postura', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value?.toFixed(1)}%`,
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
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Real"
                      dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {semanasLote < 19 
                    ? 'Fase de produção inicia na semana 19'
                    : 'Nenhum dado de produção disponível'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viabilidade">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-muted-foreground" />
                Viabilidade
              </CardTitle>
              <CardDescription>Referência de viabilidade por semana</CardDescription>
            </CardHeader>
            <CardContent>
              {viabilidadeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={viabilidadeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="semana" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Semanas', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      domain={[90, 100]}
                      label={{ value: '% Viabilidade', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value?.toFixed(1)}%`, 'Referência']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="referencia" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Referência"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de referência disponível
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
