import { AlertTriangle, Thermometer, Droplets, Wind, Flame, Info } from 'lucide-react';
import { Insight } from './types';

interface Props {
  insights: Insight[];
}

const iconMap = {
  thermometer: Thermometer,
  droplets: Droplets,
  wind: Wind,
  flame: Flame,
  alert: AlertTriangle,
};

const severidadeStyles = {
  critico: 'border-destructive/30 bg-destructive/5',
  atencao: 'border-amber-400/30 bg-amber-50',
  info: 'border-primary/20 bg-primary/5',
};

const severidadeIcon = {
  critico: 'text-destructive',
  atencao: 'text-amber-600',
  info: 'text-primary',
};

export function InsightsPanel({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Info className="w-3.5 h-3.5" />
        Análise inteligente
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {insights.map((insight) => {
          const Icon = iconMap[insight.icone];
          return (
            <div
              key={insight.id}
              className={`rounded-lg border p-3 ${severidadeStyles[insight.severidade]}`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${severidadeIcon[insight.severidade]}`} />
                <div>
                  <p className="text-sm font-medium leading-tight">{insight.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.descricao}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
