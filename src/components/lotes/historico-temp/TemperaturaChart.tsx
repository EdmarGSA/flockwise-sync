import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function TemperaturaChart({ dados }: Props) {
  const hasFaixa = dados.some(d => d.faixaMin != null);

  const chartData = dados.map(d => ({
    dia: `D${d.dia}`,
    mediana: d.tempMediana,
    p5: d.tempP5,
    p95: d.tempP95,
    rangeP: d.tempP5 != null && d.tempP95 != null ? [d.tempP5, d.tempP95] : undefined,
    faixaMin: d.faixaMin,
    faixaMax: d.faixaMax,
  }));

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Temperatura (°C) — mediana + faixa P5–P95
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: any, name: string) => {
                if (name === 'rangeP') {
                  const v = value as [number, number];
                  return [`${v[0]?.toFixed(1)}° – ${v[1]?.toFixed(1)}°`, 'P5–P95'];
                }
                return [
                  typeof value === 'number' ? `${value.toFixed(1)}°C` : value,
                  name === 'mediana' ? 'Mediana' : name === 'faixaMax' ? 'Faixa Máx' : name === 'faixaMin' ? 'Faixa Mín' : name,
                ];
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'mediana' ? 'Mediana' : value === 'rangeP' ? 'P5–P95' : value === 'faixaMax' ? 'Faixa Máx' : 'Faixa Mín'
              }
            />
            <Area
              type="monotone"
              dataKey="rangeP"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.12}
              strokeOpacity={0}
            />
            {hasFaixa && (
              <>
                <Line type="stepAfter" dataKey="faixaMax" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                <Line type="stepAfter" dataKey="faixaMin" stroke="hsl(var(--chart-2))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              </>
            )}
            <Line type="monotone" dataKey="mediana" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 2.5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
