import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export const SparklineChart = ({ 
  data, 
  color = 'hsl(var(--primary))',
  height = 24,
  className 
}: SparklineChartProps) => {
  // Convert array of numbers to chart data format
  const chartData = data.map((value, index) => ({ value, index }));

  // Determine if trend is positive or negative
  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0];

  const lineColor = color || (isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))');

  if (data.length < 2) {
    return (
      <div 
        className={className} 
        style={{ height }}
      >
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
          —
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
