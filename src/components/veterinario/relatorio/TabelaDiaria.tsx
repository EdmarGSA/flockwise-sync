import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { DiaRelatorio } from '@/hooks/useRelatorioDiarioLote';

interface Props {
  dias: DiaRelatorio[];
}

export default function TabelaDiaria({ dias }: Props) {
  const totalSemanas = Math.max(1, Math.ceil(dias.length / 7));
  const [semana, setSemana] = useState(totalSemanas);

  const diasSemana = useMemo(() => {
    const inicio = (semana - 1) * 7;
    return dias.slice(inicio, inicio + 7);
  }, [dias, semana]);

  const fmt = (n: number | null, casas = 1, sufixo = '') =>
    n == null ? <span className="text-muted-foreground">—</span> : <>{n.toFixed(casas)}{sufixo}</>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" disabled={semana <= 1} onClick={() => setSemana(s => s - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-sm font-semibold">Semana {semana} de {totalSemanas}</div>
        <Button size="sm" variant="outline" disabled={semana >= totalSemanas} onClick={() => setSemana(s => s + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 text-xs">
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-center">Idade</th>
              <th className="p-2 text-center">Temp (°C)</th>
              <th className="p-2 text-center">Umid (%)</th>
              <th className="p-2 text-center">Faixa ideal</th>
              <th className="p-2 text-center">Iluminação</th>
              <th className="p-2 text-center">Mort. nat / elim</th>
              <th className="p-2 text-center">Mort. acum %</th>
              <th className="p-2 text-center">Peso médio (kg)</th>
              <th className="p-2 text-center">vs Padrão</th>
            </tr>
          </thead>
          <tbody>
            {diasSemana.map((d) => (
              <tr key={d.data} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(d.data + 'T12:00').toLocaleDateString('pt-BR')}</td>
                <td className="p-2 text-center">D{d.idade_dias}</td>
                <td className="p-2 text-center">
                  {d.sensor_disponivel
                    ? <>{fmt(d.temp_min)} / {fmt(d.temp_max)}{d.fora_da_faixa && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}</>
                    : <span className="text-muted-foreground" title="Sensor offline">—</span>}
                </td>
                <td className="p-2 text-center">{d.sensor_disponivel ? <>{fmt(d.umid_min, 0)} / {fmt(d.umid_max, 0)}</> : '—'}</td>
                <td className="p-2 text-center text-muted-foreground">{d.faixa_temp_min}–{d.faixa_temp_max}</td>
                <td className="p-2 text-center">{d.horas_luz != null ? <>{d.horas_luz}h {d.acender && d.apagar && <span className="text-xs text-muted-foreground">({d.acender}–{d.apagar})</span>}</> : <span className="text-muted-foreground">—</span>}</td>
                <td className="p-2 text-center">{d.mortalidade_natural} / {d.mortalidade_eliminada}</td>
                <td className="p-2 text-center">{fmt(d.mortalidade_pct_acum, 2, '%')}</td>
                <td className="p-2 text-center">{fmt(d.peso_medio_kg, 3)}</td>
                <td className="p-2 text-center">
                  {d.delta_peso_pct == null ? <span className="text-muted-foreground">—</span> :
                    <Badge variant={d.delta_peso_pct < -10 ? 'destructive' : d.delta_peso_pct < -5 ? 'secondary' : 'default'}>
                      {d.delta_peso_pct > 0 ? '+' : ''}{d.delta_peso_pct.toFixed(1)}%
                    </Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {diasSemana.map((d) => (
          <Card key={d.data}>
            <CardContent className="p-3 space-y-1 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{new Date(d.data + 'T12:00').toLocaleDateString('pt-BR')}</span>
                <Badge variant="outline">D{d.idade_dias}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span>Temp: {d.sensor_disponivel ? `${d.temp_min?.toFixed(1)}/${d.temp_max?.toFixed(1)}°C` : '—'}</span>
                <span>Faixa: {d.faixa_temp_min}–{d.faixa_temp_max}°C</span>
                <span>Luz: {d.horas_luz != null ? `${d.horas_luz}h` : '—'}</span>
                <span>Mort: {d.mortalidade_total} ({d.mortalidade_pct_acum.toFixed(2)}%)</span>
                <span>Peso: {d.peso_medio_kg ? `${d.peso_medio_kg.toFixed(3)}kg` : '—'}</span>
                <span>vs Padrão: {d.delta_peso_pct != null ? `${d.delta_peso_pct.toFixed(1)}%` : '—'}</span>
              </div>
              {d.fora_da_faixa && <Badge variant="secondary" className="text-xs">⚠ Fora da faixa térmica</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
