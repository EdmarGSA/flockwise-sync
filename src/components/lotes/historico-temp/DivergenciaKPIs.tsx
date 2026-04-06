import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Thermometer, Droplets } from 'lucide-react';
import { DiaTemperatura } from './types';

interface Props {
  dados: DiaTemperatura[];
}

export function DivergenciaKPIs({ dados }: Props) {
  const diasForaTemp = dados.filter(d => d.dentroFaixa === false).length;
  const diasForaUmidade = dados.filter(d => d.umidadeDentroFaixa === false).length;
  const maiorDesvio = Math.max(0, ...dados.filter(d => d.desvioTemp != null).map(d => d.desvioTemp!));
  const diasMonitorados = dados.length;

  const kpis = [
    {
      label: 'Dias monitorados',
      value: diasMonitorados,
      icon: CheckCircle,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Temp. fora da faixa',
      value: `${diasForaTemp} dia${diasForaTemp !== 1 ? 's' : ''}`,
      icon: Thermometer,
      color: diasForaTemp > 0 ? 'text-destructive' : 'text-emerald-600',
      bg: diasForaTemp > 0 ? 'bg-destructive/10' : 'bg-emerald-50',
    },
    {
      label: 'Umid. fora da faixa',
      value: `${diasForaUmidade} dia${diasForaUmidade !== 1 ? 's' : ''}`,
      icon: Droplets,
      color: diasForaUmidade > 0 ? 'text-amber-600' : 'text-emerald-600',
      bg: diasForaUmidade > 0 ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      label: 'Maior desvio temp.',
      value: maiorDesvio > 0 ? `${maiorDesvio.toFixed(1)}°C` : '—',
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
