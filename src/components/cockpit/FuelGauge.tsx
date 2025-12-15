import { Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuelGaugeProps {
  percentage: number;
  utilizado: number;
  total: number;
  title: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export const FuelGauge = ({
  percentage,
  utilizado,
  total,
  title,
  warningThreshold = 50,
  dangerThreshold = 70
}: FuelGaugeProps) => {
  const getColor = () => {
    if (percentage >= dangerThreshold) return 'hsl(var(--destructive))';
    if (percentage >= warningThreshold) return 'hsl(var(--chart-4))';
    return 'hsl(var(--chart-2))';
  };

  const getStatus = () => {
    if (percentage >= dangerThreshold) return { label: 'ALTO RISCO', pulse: true };
    if (percentage >= warningThreshold) return { label: 'ATENÇÃO', pulse: false };
    return { label: 'SEGURO', pulse: false };
  };

  const status = getStatus();
  const color = getColor();

  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `R$ ${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `R$ ${(val / 1000).toFixed(0)}K`;
    }
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Fuel className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>

      {/* Fuel tank visualization */}
      <div className="relative">
        {/* Tank container */}
        <div className="h-8 bg-muted rounded-lg overflow-hidden border-2 border-border">
          {/* Fuel level */}
          <div 
            className={cn(
              "h-full transition-all duration-700",
              status.pulse && "animate-pulse"
            )}
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color
            }}
          />
        </div>

        {/* E and F labels */}
        <div className="flex justify-between mt-1 text-xs font-medium text-muted-foreground">
          <span>E</span>
          <span>│</span>
          <span>│</span>
          <span>│</span>
          <span>F</span>
        </div>
      </div>

      {/* Value display */}
      <div className="mt-4 text-center">
        <span 
          className={cn(
            "text-4xl font-bold",
            status.pulse && "animate-pulse"
          )}
          style={{ color }}
        >
          {percentage.toFixed(0)}%
        </span>
        <div 
          className="mt-1 text-xs font-medium px-2 py-0.5 rounded inline-block"
          style={{ 
            backgroundColor: `${color}20`,
            color
          }}
        >
          {status.label}
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Utilizado:</span>
          <span className="font-medium ml-1">{formatCurrency(utilizado)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium ml-1">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};
