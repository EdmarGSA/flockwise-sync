import { cn } from '@/lib/utils';

interface TachometerGaugeProps {
  value: number;
  max: number;
  zones: {
    green: number;  // Up to this value is green
    yellow: number; // Up to this value is yellow, above is red
  };
  title: string;
  unit?: string;
  decimals?: number;
}

export const TachometerGauge = ({
  value,
  max,
  zones,
  title,
  unit = '%',
  decimals = 2
}: TachometerGaugeProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const getStatus = () => {
    if (value <= zones.green) return { color: 'hsl(var(--chart-2))', label: 'OK', pulse: false };
    if (value <= zones.yellow) return { color: 'hsl(var(--chart-4))', label: 'ATENÇÃO', pulse: false };
    return { color: 'hsl(var(--destructive))', label: 'CRÍTICO', pulse: true };
  };

  const status = getStatus();

  // Calculate zone widths as percentages
  const greenWidth = (zones.green / max) * 100;
  const yellowWidth = ((zones.yellow - zones.green) / max) * 100;
  const redWidth = 100 - greenWidth - yellowWidth;

  return (
    <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
      <div className="text-sm font-medium text-muted-foreground mb-2">{title}</div>
      
      {/* Tachometer display */}
      <div className="relative w-full max-w-[200px]">
        {/* Zone bar */}
        <div className="h-4 rounded-full overflow-hidden flex mb-2">
          <div 
            className="h-full bg-chart-2" 
            style={{ width: `${greenWidth}%` }}
          />
          <div 
            className="h-full bg-chart-4" 
            style={{ width: `${yellowWidth}%` }}
          />
          <div 
            className="h-full bg-destructive" 
            style={{ width: `${redWidth}%` }}
          />
        </div>

        {/* Indicator needle */}
        <div 
          className="absolute top-0 h-4 w-0.5 bg-foreground transition-all duration-500"
          style={{ 
            left: `${percentage}%`,
            transform: 'translateX(-50%)'
          }}
        />
        <div 
          className="absolute top-4 w-0 h-0 transition-all duration-500"
          style={{ 
            left: `${percentage}%`,
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid hsl(var(--foreground))'
          }}
        />
      </div>

      {/* Value display */}
      <div className={cn(
        "mt-4 text-3xl font-bold transition-all",
        status.pulse && "animate-pulse"
      )} style={{ color: status.color }}>
        {value.toFixed(decimals)}{unit}
      </div>

      {/* Status badge */}
      <div 
        className={cn(
          "mt-2 px-3 py-1 rounded-full text-xs font-medium",
          status.pulse && "animate-pulse"
        )}
        style={{ 
          backgroundColor: `${status.color}20`,
          color: status.color
        }}
      >
        {status.label}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between w-full max-w-[200px] mt-2 text-[10px] text-muted-foreground">
        <span>0</span>
        <span>{zones.green}</span>
        <span>{zones.yellow}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
