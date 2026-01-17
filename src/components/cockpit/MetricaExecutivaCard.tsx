import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MetricaExecutivaCardProps {
  title: string;
  value: number;
  unit?: string;
  decimals?: number;
  status: 'ok' | 'warning' | 'danger';
  statusLabel?: string;
  meta?: number;
  metaLabel?: string;
  referencia?: number;
  referenciaLabel?: string;
  progressValue?: number; // 0-100
  progressMax?: number;
  trend?: 'up' | 'down' | 'stable';
  detalhe?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const MetricaExecutivaCard = ({
  title,
  value,
  unit = '',
  decimals = 2,
  status,
  statusLabel,
  meta,
  metaLabel,
  referencia,
  referenciaLabel,
  progressValue,
  progressMax = 100,
  trend,
  detalhe,
  icon,
  compact = false
}: MetricaExecutivaCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ok': return 'hsl(var(--chart-2))';
      case 'warning': return 'hsl(var(--chart-4))';
      case 'danger': return 'hsl(var(--destructive))';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'ok': return 'bg-chart-2/20';
      case 'warning': return 'bg-chart-4/20';
      case 'danger': return 'bg-destructive/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-4 h-4" style={{ color: getStatusColor() }} />;
      case 'warning': return <AlertTriangle className="w-4 h-4" style={{ color: getStatusColor() }} />;
      case 'danger': return <XCircle className="w-4 h-4" style={{ color: getStatusColor() }} />;
    }
  };

  const getDefaultStatusLabel = () => {
    switch (status) {
      case 'ok': return 'EXCELENTE';
      case 'warning': return 'ATENÇÃO';
      case 'danger': return 'CRÍTICO';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-chart-2" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      case 'stable': return <Minus className="w-4 h-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const formatValue = (val: number) => {
    if (Number.isInteger(val) || decimals === 0) return val.toString();
    return val.toFixed(decimals);
  };

  const progressPercent = progressValue !== undefined 
    ? Math.min((progressValue / progressMax) * 100, 100)
    : undefined;

  if (compact) {
    return (
      <div className="bg-background/50 rounded-lg border p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          {getStatusIcon()}
        </div>
        <div className="flex items-baseline gap-1">
          <span 
            className="text-xl font-bold font-mono"
            style={{ color: getStatusColor() }}
          >
            {formatValue(value)}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        {meta !== undefined && (
          <span className="text-xs text-muted-foreground">Meta: {formatValue(meta)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background/50 rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        {getTrendIcon()}
      </div>

      {/* Main Value */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          {trend && getTrendIcon()}
          <span 
            className="text-3xl font-bold font-mono"
            style={{ color: getStatusColor() }}
          >
            {formatValue(value)}
          </span>
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </div>
        
        {/* Status Badge */}
        <span 
          className={cn(
            "inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full",
            getStatusBg()
          )}
          style={{ color: getStatusColor() }}
        >
          {getStatusIcon()}
          {statusLabel || getDefaultStatusLabel()}
        </span>
      </div>

      {/* Progress Bar */}
      {progressPercent !== undefined && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: getStatusColor()
            }}
          />
        </div>
      )}

      {/* Details */}
      <div className="space-y-1 text-xs">
        {referencia !== undefined && (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{referenciaLabel || 'Ref'}:</span>
            <span className="font-mono">{formatValue(referencia)}</span>
          </div>
        )}
        {meta !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{metaLabel || 'Meta'}:</span>
            <span 
              className="font-mono font-medium"
              style={{ color: status === 'ok' ? getStatusColor() : 'inherit' }}
            >
              {formatValue(meta)}
            </span>
          </div>
        )}
        {detalhe && (
          <div className="text-muted-foreground text-center pt-1 border-t">
            {detalhe}
          </div>
        )}
      </div>
    </div>
  );
};
