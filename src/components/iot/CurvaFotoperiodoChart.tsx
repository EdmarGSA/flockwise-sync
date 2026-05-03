import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Bloco { acender: string; apagar: string; intensidade_pct?: number }
interface Faixa {
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  blocos: Bloco[] | null;
  intensidade_pct: number;
}

interface Props {
  faixas: Faixa[];
}

interface Ponto {
  dia: number;
  horas_luz: number;
  intensidade: number;
}

export function CurvaFotoperiodoChart({ faixas }: Props) {
  const data = useMemo<Ponto[]>(() => {
    if (!faixas?.length) return [];
    const ordenadas = [...faixas].sort((a, b) => a.dia_inicio - b.dia_inicio);
    const pontos: Ponto[] = [];
    for (const f of ordenadas) {
      pontos.push({ dia: f.dia_inicio, horas_luz: Number(f.horas_luz) || 0, intensidade: f.intensidade_pct ?? 0 });
      pontos.push({ dia: f.dia_fim, horas_luz: Number(f.horas_luz) || 0, intensidade: f.intensidade_pct ?? 0 });
    }
    return pontos;
  }, [faixas]);

  if (data.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Curva de Fotoperíodo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="it" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11}
                label={{ value: 'Idade (dias)', position: 'insideBottom', offset: -4, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" stroke="hsl(var(--primary))" fontSize={11} domain={[0, 24]}
                label={{ value: 'Horas de luz', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--primary))' }} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" fontSize={11} domain={[0, 100]}
                label={{ value: 'Intensidade %', angle: 90, position: 'insideRight', fontSize: 11, fill: 'hsl(var(--chart-2))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                formatter={(v: number, name: string) => [
                  name === 'horas_luz' ? `${v}h` : `${v}%`,
                  name === 'horas_luz' ? 'Horas de luz' : 'Intensidade',
                ]}
                labelFormatter={(l) => `Dia ${l}`}
              />
              <Area yAxisId="left" type="stepAfter" dataKey="horas_luz" stroke="hsl(var(--primary))"
                fill="url(#hl)" strokeWidth={2} />
              <Area yAxisId="right" type="stepAfter" dataKey="intensidade" stroke="hsl(var(--chart-2))"
                fill="url(#it)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
