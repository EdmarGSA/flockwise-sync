import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatusProgressCardProps {
  title: string;
  value: number;
  unit: string;
  min?: number;
  max: number;
  metaMin?: number;
  metaMax?: number;
  inverted?: boolean; // Lower is better (e.g., giro estoque)
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
}

export const StatusProgressCard = ({
  title,
  value,
  unit,
  min = 0,
  max,
  metaMin,
  metaMax,
  inverted = false,
  trend,
  trendValue,
  icon
}: StatusProgressCardProps) => {
  // Calculate status based on value and meta
  const getStatus = (): 'ok' | 'warning' | 'danger' => {
    if (inverted) {
      // For inverted metrics (lower is better)
      if (metaMax !== undefined) {
        if (value <= metaMax) return 'ok';
        if (value <= metaMax * 1.5) return 'warning';
        return 'danger';
      }
      // Default thresholds for inverted
      const threshold = max * 0.5;
      if (value <= threshold) return 'ok';
      if (value <= threshold * 1.5) return 'warning';
      return 'danger';
    } else {
      // For normal metrics (higher is better)
      if (metaMin !== undefined) {
        if (value >= metaMin) return 'ok';
        if (value >= metaMin * 0.85) return 'warning';
        return 'danger';
      }
      // Default thresholds
      const threshold = max * 0.9;
      if (value >= threshold) return 'ok';
      if (value >= threshold * 0.85) return 'warning';
      return 'danger';
    }
  };

  const status = getStatus();
  
  const getStatusColor = () => {
    switch (status) {
      case 'ok': return 'hsl(var(--chart-2))';
      case 'warning': return 'hsl(var(--chart-4))';
      case 'danger': return 'hsl(var(--destructive))';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'ok': return 'bg-chart-2';
      case 'warning': return 'bg-chart-4';
      case 'danger': return 'bg-destructive';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'ok': return '🟢';
      case 'warning': return '🟡';
      case 'danger': return '🔴';
    }
  };

  // Calculate progress percentage
  const progressValue = Math.min(((value - min) / (max - min)) * 100, 100);

  // Format meta display
  const metaDisplay = metaMin !== undefined && metaMax !== undefined 
    ? `${metaMin}–${metaMax} ${unit}`
    : metaMin !== undefined 
      ? `≥ ${metaMin} ${unit}`
      : metaMax !== undefined
        ? `≤ ${metaMax} ${unit}`
        : null;

  return (
    <div className="bg-background/50 rounded-lg border p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <span className="text-lg">{getStatusLabel()}</span>
      </div>

      {/* Value Display */}
      <div className="flex items-baseline gap-1">
        <span 
          className="text-2xl font-bold font-mono"
          style={{ color: getStatusColor() }}
        >
          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", getStatusBg())}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        
        {/* Meta markers */}
        {metaMin !== undefined && !inverted && (
          <div 
            className="absolute top-0 w-0.5 h-2 bg-foreground/50"
            style={{ left: `${((metaMin - min) / (max - min)) * 100}%` }}
          />
        )}
        {metaMax !== undefined && inverted && (
          <div 
            className="absolute top-0 w-0.5 h-2 bg-foreground/50"
            style={{ left: `${((metaMax - min) / (max - min)) * 100}%` }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {metaDisplay && (
          <span>Ideal: {metaDisplay}</span>
        )}
        
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-chart-2" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
            {trend === 'stable' && <Minus className="w-3 h-3" />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
