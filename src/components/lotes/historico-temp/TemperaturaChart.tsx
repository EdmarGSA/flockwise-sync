import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function TemperaturaChart({ dados }: Props) {
  const hasFaixa = dados.some(d => d.faixaMin != null);

  const chartData = dados.map(d => ({
    dia: `D${d.dia}`,
    min: d.tempMin,
    max: d.tempMax,
    faixaMin: d.faixaMin,
    faixaMax: d.faixaMax,
  }));

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Temperatura (°C)</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} label={{ value: '°C', position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}°C`,
                name === 'max' ? 'Máxima' : name === 'min' ? 'Mínima' : name === 'faixaMax' ? 'Faixa Máx' : 'Faixa Mín',
              ]}
            />
            <Legend
              formatter={(value: string) =>
                value === 'max' ? 'Máxima' : value === 'min' ? 'Mínima' : value === 'faixaMax' ? 'Faixa Máx' : 'Faixa Mín'
              }
            />
            {hasFaixa && (
              <>
                <Line type="stepAfter" dataKey="faixaMax" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                <Line type="stepAfter" dataKey="faixaMin" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              </>
            )}
            <Line type="monotone" dataKey="max" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="min" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
