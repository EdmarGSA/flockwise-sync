import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  min?: number;
  max: number;
  thresholds: {
    danger: number;
    warning: number;
    ok: number;
  };
  title: string;
  unit?: string;
  inverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const GaugeChart = ({
  value,
  min = 0,
  max,
  thresholds,
  title,
  unit = '',
  inverted = false,
  size = 'md'
}: GaugeChartProps) => {
  const percentage = Math.min(Math.max((value - min) / (max - min) * 100, 0), 100);
  
  const getColor = () => {
    if (inverted) {
      if (value <= thresholds.ok) return 'hsl(var(--chart-2))'; // Green
      if (value <= thresholds.warning) return 'hsl(var(--chart-4))'; // Yellow
      return 'hsl(var(--destructive))'; // Red
    } else {
      if (value >= thresholds.ok) return 'hsl(var(--chart-2))'; // Green
      if (value >= thresholds.warning) return 'hsl(var(--chart-4))'; // Yellow
      return 'hsl(var(--destructive))'; // Red
    }
  };

  const data = [{ value: percentage, fill: getColor() }];

  const sizeClasses = {
    sm: 'w-28 h-28',
    md: 'w-36 h-36',
    lg: 'w-44 h-44'
  };

  const fontSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className="flex flex-col items-center">
      <div className={cn("relative", sizeClasses[size])}>
        {/* Background arc */}
        <div className="absolute inset-0 rounded-full border-8 border-muted opacity-30" 
             style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }} />
        
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            barSize={12}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              cornerRadius={6}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className={cn("font-bold", fontSize[size])} style={{ color: getColor() }}>
            {value.toFixed(value % 1 === 0 ? 0 : 1)}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>

        {/* Tick marks */}
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground">{min}</div>
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">{max}</div>
      </div>
      <span className="text-sm font-medium text-foreground mt-1">{title}</span>
    </div>
  );
};
