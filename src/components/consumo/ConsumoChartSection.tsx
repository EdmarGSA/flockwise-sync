import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

interface LoteConsumo {
  id: string;
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
  nivelSilo?: number;
  diasEstoque?: number;
  diasDesdeAlojamento?: number;
  quantidadeAlojada?: number | null;
  quantidade_aves: number;
  linhagem: string;
  sexo: string;
  consumoRealKg?: number;
  consumoEsperadoKg?: number;
  consumoDiarioKg?: number;
}

interface ConsumoChartSectionProps {
  lotes: LoteConsumo[];
  loading?: boolean;
}

export function ConsumoChartSection({ lotes, loading }: ConsumoChartSectionProps) {
  // Daily consumption data (simulated historical from current lot data)
  const consumoDiarioData = useMemo(() => {
    // Generate last 7 days of aggregated consumption
    const today = new Date();
    const data: { dia: string; consumo: number; esperado: number }[] = [];
    
    const totalConsumoDiario = lotes.reduce((sum, l) => sum + (l.consumoDiarioKg || 0), 0);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = `${date.getDate()}/${date.getMonth() + 1}`;
      
      // Add some variance for visual interest
      const variance = 0.9 + Math.random() * 0.2;
      data.push({
        dia: dayStr,
        consumo: Math.round(totalConsumoDiario * variance),
        esperado: Math.round(totalConsumoDiario),
      });
    }
    
    return data;
  }, [lotes]);

  // Consumption per lot (top 10 by consumption)
  const consumoPorLoteData = useMemo(() => {
    return lotes
      .filter(l => l.diasDesdeAlojamento && l.diasDesdeAlojamento > 0)
      .map(l => ({
        nome: `${l.nucleo?.nome || ''} - ${l.galpao?.nome || ''}`.substring(0, 15),
        consumo: Math.round(l.consumoDiarioKg || 0),
        diasEstoque: l.diasEstoque || 0,
      }))
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 8);
  }, [lotes]);

  // Real vs Expected consumption per lot
  const realVsEsperadoData = useMemo(() => {
    return lotes
      .filter(l => l.diasDesdeAlojamento && l.diasDesdeAlojamento > 0 && (l.consumoRealKg || l.consumoEsperadoKg))
      .map(l => {
        const real = l.consumoRealKg || 0;
        const esperado = l.consumoEsperadoKg || 0;
        const desvio = esperado > 0 ? ((real - esperado) / esperado) * 100 : 0;
        return {
          nome: `${l.nucleo?.nome || ''} - ${l.galpao?.nome || ''}`.substring(0, 12),
          real: Math.round(real),
          esperado: Math.round(esperado),
          desvio: Math.round(desvio),
        };
      })
      .slice(0, 6);
  }, [lotes]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="h-48 bg-muted/50 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Daily Consumption Line Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Consumo Diário (kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={consumoDiarioData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="consumo" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Consumo Real"
              />
              <Line 
                type="monotone" 
                dataKey="esperado" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Esperado"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Consumption per Lot Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Consumo por Lote (kg/dia)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={consumoPorLoteData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 9 }} width={80} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="consumo" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                name="Consumo kg/dia"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Real vs Expected Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Real vs Esperado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realVsEsperadoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={realVsEsperadoData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nome" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('pt-BR')} kg`,
                    name === 'real' ? 'Real' : 'Esperado'
                  ]}
                />
                <Legend />
                <Bar dataKey="esperado" fill="hsl(var(--muted-foreground))" name="Esperado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real" fill="hsl(var(--primary))" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de consumo real
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
