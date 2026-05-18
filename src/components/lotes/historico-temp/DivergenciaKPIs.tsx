import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Thermometer, Clock } from 'lucide-react';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function DivergenciaKPIs({ dados }: Props) {
  const diasForaTemp = dados.filter(d => d.dentroFaixa === false).length;
  const maiorDesvio = Math.max(0, ...dados.filter(d => d.desvioTemp != null).map(d => d.desvioTemp!));
  const diasMonitorados = dados.length;
  const totalMinFora = dados.reduce((s, d) => s + (d.minutosForaFaixa || 0), 0);
  const horasFora = (totalMinFora / 60);

  const ultimo = dados[dados.length - 1];
  const zonaInfo = ultimo
    ? `${ultimo.sensoresUsados}/${ultimo.sensoresTotal} sensores · ${ultimo.zonaAtiva}`
    : '—';

  const kpis = [
    {
      label: 'Dias monitorados',
      value: diasMonitorados,
      sub: zonaInfo,
      icon: CheckCircle,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Dias fora da faixa',
      value: `${diasForaTemp} dia${diasForaTemp !== 1 ? 's' : ''}`,
      sub: 'usando min/máx sustentado',
      icon: Thermometer,
      color: diasForaTemp > 0 ? 'text-destructive' : 'text-emerald-600',
      bg: diasForaTemp > 0 ? 'bg-destructive/10' : 'bg-emerald-50',
    },
    {
      label: 'Tempo fora da faixa',
      value: horasFora >= 1 ? `${horasFora.toFixed(1)} h` : `${totalMinFora} min`,
      sub: 'acumulado no período',
      icon: Clock,
      color: totalMinFora > 60 ? 'text-amber-600' : totalMinFora > 0 ? 'text-amber-500' : 'text-emerald-600',
      bg: totalMinFora > 60 ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      label: 'Maior desvio temp.',
      value: maiorDesvio > 0 ? `${maiorDesvio.toFixed(1)}°C` : '—',
      sub: 'do limite da faixa',
      icon: AlertTriangle,
      color: maiorDesvio > 3 ? 'text-destructive' : maiorDesvio > 0 ? 'text-amber-600' : 'text-muted-foreground',
      bg: maiorDesvio > 3 ? 'bg-destructive/10' : maiorDesvio > 0 ? 'bg-amber-50' : 'bg-muted/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${kpi.bg}`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              <p className={`text-sm font-semibold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{kpi.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
