import { cn } from '@/lib/utils';

interface CompassIndicatorProps {
  percentage: number; // 0-100+, where 100 is ideal (north)
  title: string;
  subtitle?: string;
  referenceValue?: number;
  actualValue?: number;
  unit?: string;
}

export const CompassIndicator = ({
  percentage,
  title,
  subtitle,
  referenceValue,
  actualValue,
  unit = ''
}: CompassIndicatorProps) => {
  // Convert percentage to angle (0% = 180° south, 100% = 0° north)
  const angle = 180 - (Math.min(Math.max(percentage, 0), 120) * 1.5);
  
  const getColor = () => {
    if (percentage >= 98) return 'hsl(var(--chart-2))';
    if (percentage >= 90) return 'hsl(var(--chart-4))';
    return 'hsl(var(--destructive))';
  };

  const getStatus = () => {
    if (percentage >= 98) return 'EXCELENTE';
    if (percentage >= 95) return 'BOM';
    if (percentage >= 90) return 'ATENÇÃO';
    return 'CRÍTICO';
  };

  const color = getColor();

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col items-center">
      <span className="text-sm font-medium text-muted-foreground mb-2">{title}</span>
      
      {/* Compass container */}
      <div className="relative w-36 h-36">
        {/* Compass ring */}
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        
        {/* Cardinal directions */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-chart-2">N</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-destructive">S</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">W</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">E</div>

        {/* Compass rose (background) */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-b from-chart-2/10 to-destructive/10" />

        {/* Needle */}
        <div 
          className="absolute top-1/2 left-1/2 origin-center transition-transform duration-700"
          style={{ 
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          }}
        >
          {/* North pointer (colored) */}
          <div 
            className="w-2 h-14 -mt-14 mx-auto rounded-t-full"
            style={{ backgroundColor: color }}
          />
          {/* South pointer (gray) */}
          <div className="w-2 h-10 mx-auto rounded-b-full bg-muted-foreground/50" />
        </div>

        {/* Center dot */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2"
          style={{ 
            backgroundColor: color,
            borderColor: 'hsl(var(--background))'
          }}
        />
      </div>

      {/* Value display */}
      <div className="mt-3 text-center">
        <span 
          className="text-3xl font-bold"
          style={{ color }}
        >
          {percentage.toFixed(1)}%
        </span>
        <div 
          className="mt-1 text-xs font-medium px-2 py-0.5 rounded inline-block"
          style={{ 
            backgroundColor: `${color}20`,
            color
          }}
        >
          {getStatus()}
        </div>
      </div>

      {/* Reference comparison */}
      {referenceValue !== undefined && actualValue !== undefined && (
        <div className="mt-3 pt-3 border-t w-full text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Referência:</span>
            <span className="font-medium">{referenceValue.toFixed(2)}{unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Atual:</span>
            <span className="font-medium" style={{ color }}>
              {actualValue.toFixed(2)}{unit}
            </span>
          </div>
        </div>
      )}

      {subtitle && (
        <span className="text-xs text-muted-foreground mt-2">{subtitle}</span>
      )}
    </div>
  );
};
