import { AlertTriangle, WifiOff, Activity, Brain, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { minutosDesde } from '@/lib/ambiencia/statusCanal';
import type { AmbienciaLoteData } from '@/types/ambienciaLote';
import { isDispositivoOnline, statusCanal } from '@/lib/ambiencia/statusCanal';

interface Props { data: AmbienciaLoteData; onScrollTo?: (id: string) => void; }

interface Alerta {
  id: string;
  texto: string;
  Icon: any;
  cls: string;
  scrollTo?: string;
}

export function BarraAlertasOperacionais({ data, onScrollTo }: Props) {
  const alertas: Alerta[] = [];

  // Sensor mudo
  const ultimaLeitura = data.serieKpi[0];
  const minDesdeLeitura = minutosDesde(ultimaLeitura?.lido_em);
  if (data.dispositivos.length > 0 && (minDesdeLeitura === null || minDesdeLeitura > 10)) {
    alertas.push({
      id: 'sensor-mudo',
      texto: `Sensor sem dados${minDesdeLeitura !== null ? ` há ${minDesdeLeitura} min` : ''}`,
      Icon: Activity,
      cls: 'bg-destructive/10 text-destructive border-destructive/30',
      scrollTo: 'kpis',
    });
  }

  // Dispositivo offline
  const offlines = data.dispositivos.filter((d) => !isDispositivoOnline(d));
  if (offlines.length > 0) {
    alertas.push({
      id: 'dev-offline',
      texto: `${offlines.length} dispositivo${offlines.length > 1 ? 's' : ''} offline`,
      Icon: WifiOff,
      cls: 'bg-destructive/10 text-destructive border-destructive/30',
      scrollTo: 'dispositivos',
    });
  }

  // Sem ACK
  const devMap = new Map(data.dispositivos.map((d) => [d.id, d]));
  const semAck = data.canais.filter((c) => statusCanal(c, devMap.get(c.dispositivo_id)) === 'sem_ack');
  if (semAck.length > 0) {
    alertas.push({
      id: 'sem-ack',
      texto: `${semAck.length} canal${semAck.length > 1 ? 'is' : ''} sem ACK`,
      Icon: AlertTriangle,
      cls: 'bg-warning/10 text-warning-foreground border-warning/30',
      scrollTo: 'dispositivos',
    });
  }

  // Brain parado
  const minBrain = minutosDesde(data.ultimaDecisaoClima?.created_at ?? null);
  if (data.dispositivos.length > 0 && (minBrain === null || minBrain > 15)) {
    alertas.push({
      id: 'brain-parado',
      texto: `Brain sem decisão${minBrain !== null ? ` há ${minBrain} min` : ''}`,
      Icon: Brain,
      cls: 'bg-warning/10 text-warning-foreground border-warning/30',
      scrollTo: 'timeline',
    });
  }

  // Override Brain ativo (informativo)
  if (data.overrideBrainHoje) {
    alertas.push({
      id: 'override-brain',
      texto: `Override Brain hoje · ${data.overrideBrainHoje.horas_luz}h luz`,
      Icon: Lightbulb,
      cls: 'bg-primary/10 text-primary border-primary/30',
      scrollTo: 'programacao',
    });
  }

  if (alertas.length === 0) return null;

  return (
    <Card className="p-3 border-l-4 border-l-warning">
      <div className="flex flex-wrap gap-2">
        {alertas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => a.scrollTo && onScrollTo?.(a.scrollTo)}
            className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium ${a.cls}`}
          >
            <a.Icon className="h-3.5 w-3.5" />
            {a.texto}
          </button>
        ))}
      </div>
    </Card>
  );
}
