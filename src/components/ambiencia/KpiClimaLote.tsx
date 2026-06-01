import { Card } from '@/components/ui/card';
import { Thermometer, Droplets, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calcularITH, classificarITH } from '@/lib/utils/calcularITH';
import type { LeituraSensor } from '@/types/ambienciaLote';

interface Props {
  leiturasUltimas: LeituraSensor[];
  serieKpi: LeituraSensor[];
  setpointAlvo?: number | null;
}

function mediaUltimas(leis: LeituraSensor[], key: 'temperatura_c' | 'umidade_pct') {
  const vals = leis.map((l) => l[key]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function tendencia(serie: LeituraSensor[]): { delta: number; dir: 'up' | 'down' | 'flat' } {
  const valores = serie
    .map((l) => l.temperatura_c)
    .filter((v): v is number => v != null);
  if (valores.length < 2) return { delta: 0, dir: 'flat' };
  const mais_recente = valores[0];
  const mais_antigo = valores[valores.length - 1];
  const delta = mais_recente - mais_antigo;
  if (Math.abs(delta) < 0.2) return { delta, dir: 'flat' };
  return { delta, dir: delta > 0 ? 'up' : 'down' };
}

export function KpiClimaLote({ leiturasUltimas, serieKpi, setpointAlvo }: Props) {
  const temp = mediaUltimas(leiturasUltimas, 'temperatura_c');
  const ur = mediaUltimas(leiturasUltimas, 'umidade_pct');
  const ith = temp != null && ur != null ? calcularITH(temp, ur) : null;
  const classITH = ith != null ? classificarITH(ith) : null;
  const delta = temp != null && setpointAlvo != null ? temp - setpointAlvo : null;
  const trend = tendencia(serieKpi);

  const TrendIcon = trend.dir === 'up' ? TrendingUp : trend.dir === 'down' ? TrendingDown : Minus;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Kpi Icon={Thermometer} label="Temp." value={temp != null ? `${temp.toFixed(1)}°C` : '—'} />
      <Kpi Icon={Target} label="Alvo" value={setpointAlvo != null ? `${setpointAlvo.toFixed(1)}°C` : '—'} />
      <Kpi
        Icon={TrendIcon}
        label="Δ alvo"
        value={delta != null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}°C` : '—'}
        tone={delta == null ? undefined : Math.abs(delta) > 1.5 ? 'destructive' : Math.abs(delta) > 0.8 ? 'warning' : 'success'}
      />
      <Kpi Icon={Droplets} label="UR" value={ur != null ? `${ur.toFixed(0)}%` : '—'} />
      <Kpi
        Icon={TrendIcon}
        label="ITH"
        value={ith != null ? ith.toFixed(0) : '—'}
        sub={classITH?.label}
      />
    </div>
  );
}

function Kpi({
  Icon, label, value, sub, tone,
}: {
  Icon: any; label: string; value: string; sub?: string; tone?: 'success' | 'warning' | 'destructive';
}) {
  const toneCls = tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : '';
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
