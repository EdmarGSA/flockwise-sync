import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DiaTemperatura, UMIDADE_MIN, UMIDADE_MAX } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function UmidadeChart({ dados }: Props) {
  const hasUmidade = dados.some(d => d.umidadeMediana !== null);
  if (!hasUmidade) return null;

  const chartData = dados.map(d => ({
    dia: `D${d.dia}`,
    mediana: d.umidadeMediana,
    min: d.umidadeMin,
    max: d.umidadeMax,
  }));

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Umidade relativa (%)</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[30, 100]} label={{ value: '%', position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => [
                `${value?.toFixed(1)}%`,
                name === 'max' ? 'Máxima' : 'Mínima',
              ]}
            />
            <ReferenceLine y={UMIDADE_MIN} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} />
            <ReferenceLine y={UMIDADE_MAX} stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} />
            <Area type="monotone" dataKey="max" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 2 }} />
            <Area type="monotone" dataKey="min" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.1} strokeWidth={2} dot={{ r: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
