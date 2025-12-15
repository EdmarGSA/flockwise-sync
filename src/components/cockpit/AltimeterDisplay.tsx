import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AltimeterDisplayProps {
  value: number;
  entradas: number;
  saidas: number;
  title: string;
  period?: string;
}

export const AltimeterDisplay = ({
  value,
  entradas,
  saidas,
  title,
  period = '7 dias'
}: AltimeterDisplayProps) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const getStatusColor = () => {
    if (isPositive) return 'hsl(var(--chart-2))';
    if (isNegative) return 'hsl(var(--destructive))';
    return 'hsl(var(--chart-4))';
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <span className="text-xs bg-muted px-2 py-1 rounded">{period}</span>
      </div>

      {/* Digital display */}
      <div 
        className={cn(
          "relative bg-background/50 rounded-lg p-4 border-2 transition-all",
          isNegative && "border-destructive animate-pulse"
        )}
        style={{ borderColor: isNegative ? undefined : getStatusColor() }}
      >
        {/* Main value */}
        <div className="flex items-center justify-center gap-2">
          {isPositive && <ArrowUp className="w-6 h-6" style={{ color: getStatusColor() }} />}
          {isNegative && <ArrowDown className="w-6 h-6" style={{ color: getStatusColor() }} />}
          {isNeutral && <Minus className="w-6 h-6" style={{ color: getStatusColor() }} />}
          
          <span 
            className="text-3xl font-bold font-mono"
            style={{ color: getStatusColor() }}
          >
            {formatCurrency(Math.abs(value))}
          </span>
        </div>

        {/* Altitude indicator */}
        <div className="mt-2 text-center">
          <span 
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${getStatusColor()}20`,
              color: getStatusColor()
            }}
          >
            {isPositive ? 'SUBINDO' : isNegative ? 'DESCENDO' : 'ESTÁVEL'}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Entradas</span>
          <span className="font-medium text-chart-2">
            {formatCurrency(entradas)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Saídas</span>
          <span className="font-medium text-destructive">
            {formatCurrency(saidas)}
          </span>
        </div>
      </div>
    </div>
  );
};
