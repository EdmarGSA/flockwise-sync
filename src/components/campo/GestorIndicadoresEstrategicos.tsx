import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import { AnalyticsSummary, LoteAnalytics } from '@/hooks/useLoteAnalytics';

interface GestorIndicadoresEstrategicosProps {
  summary: AnalyticsSummary | null;
  analytics: LoteAnalytics[];
  loading: boolean;
}

export function GestorIndicadoresEstrategicos({ summary, analytics, loading }: GestorIndicadoresEstrategicosProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="pt-6">
              <div className="h-40 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pieData = [
    { name: 'OK', value: summary.lotesOk, color: '#22c55e' },
    { name: 'Atenção', value: summary.lotesAlerta, color: '#eab308' },
    { name: 'Crítico', value: summary.lotesCriticos, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Peso médio geral vs referência
  const lotesComPeso = analytics.filter(l => l.pesoAtual > 0);
  const pesoMedioGeral = lotesComPeso.length > 0
    ? lotesComPeso.reduce((acc, l) => acc + l.pesoAtual, 0) / lotesComPeso.length
    : 0;
  const pesoReferenciaGeral = lotesComPeso.length > 0
    ? lotesComPeso.reduce((acc, l) => acc + l.pesoReferencia, 0) / lotesComPeso.length
    : 0;
  const diferencaPeso = pesoReferenciaGeral > 0 
    ? ((pesoMedioGeral - pesoReferenciaGeral) / pesoReferenciaGeral) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Gráfico Pizza - Distribuição por Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [`${value} lotes`, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Impacto Financeiro */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Impacto Financeiro Estimado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total */}
          <div className="text-center pb-3 border-b border-border">
            <p className="text-xs text-muted-foreground mb-1">Perda Total Estimada</p>
            <p className={`text-3xl font-bold ${summary.impactoFinanceiroTotal > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {formatCurrency(summary.impactoFinanceiroTotal)}
            </p>
          </div>

          {/* Detalhamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Excesso CA</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(analytics.reduce((acc, l) => acc + l.custoExcessoCA, 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  +{summary.excessoRacaoTotal.toFixed(0)} kg ração
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Mortalidade</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(summary.perdaMortalidadeTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  acima da meta
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Peso Médio Geral */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Peso Médio Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lotesComPeso.length > 0 ? (
            <div className="space-y-4">
              {/* Barra de progresso visual */}
              <div className="relative pt-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Real</span>
                  <span>Referência</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      diferencaPeso >= 0 ? 'bg-green-500' : diferencaPeso > -5 ? 'bg-yellow-500' : 'bg-destructive'
                    }`}
                    style={{ 
                      width: `${Math.min(Math.max((pesoMedioGeral / pesoReferenciaGeral) * 100, 0), 100)}%` 
                    }}
                  />
                </div>
                {/* Marcador de referência */}
                <div 
                  className="absolute top-6 w-0.5 h-6 bg-foreground/50"
                  style={{ left: '100%', transform: 'translateX(-50%)' }}
                />
              </div>

              {/* Valores */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {pesoMedioGeral.toFixed(2)} kg
                  </p>
                  <p className="text-xs text-muted-foreground">Peso Real</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {pesoReferenciaGeral.toFixed(2)} kg
                  </p>
                  <p className="text-xs text-muted-foreground">Referência</p>
                </div>
              </div>

              {/* Diferença */}
              <div className="text-center pt-2 border-t border-border">
                <p className={`text-lg font-semibold ${
                  diferencaPeso >= 0 ? 'text-green-500' : diferencaPeso > -5 ? 'text-yellow-500' : 'text-destructive'
                }`}>
                  {diferencaPeso >= 0 ? '+' : ''}{diferencaPeso.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {diferencaPeso >= 0 ? 'acima' : 'abaixo'} da referência
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de peso
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
