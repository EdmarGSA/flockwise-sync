import { cn } from '@/lib/utils';
import { Activity, TrendingUp, Skull, Utensils, Package, Wallet, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ScoreIndicator {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'danger';
  value?: string;
}

interface ScoreOperacionalCardProps {
  score: number;
  indicators: ScoreIndicator[];
  loading?: boolean;
}

export const ScoreOperacionalCard = ({ score, indicators, loading }: ScoreOperacionalCardProps) => {
  const getScoreStatus = () => {
    if (score >= 80) return { label: 'EXCELENTE', color: 'hsl(var(--chart-2))', bgClass: 'bg-chart-2/20' };
    if (score >= 50) return { label: 'ATENÇÃO', color: 'hsl(var(--chart-4))', bgClass: 'bg-chart-4/20' };
    return { label: 'CRÍTICO', color: 'hsl(var(--destructive))', bgClass: 'bg-destructive/20' };
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'danger') => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-chart-4" />;
      case 'danger': return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    }
  };

  const status = getScoreStatus();

  if (loading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm p-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-16 bg-muted rounded mb-4" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <span className="font-semibold">Saúde Operacional</span>
      </div>

      {/* Score Display */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3">
          <span 
            className="text-4xl font-bold font-mono"
            style={{ color: status.color }}
          >
            {score}
          </span>
          <span className="text-2xl text-muted-foreground font-light">/ 100</span>
        </div>
        <span 
          className={cn(
            "inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full",
            status.bgClass
          )}
          style={{ color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress 
          value={score} 
          className="h-3"
          style={{ 
            ['--progress-background' as string]: status.color 
          }}
        />
      </div>

      {/* Indicators Summary */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {indicators.map((indicator) => (
          <div 
            key={indicator.id}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50"
          >
            {getStatusIcon(indicator.status)}
            <span className="text-muted-foreground">{indicator.label}</span>
            {indicator.value && (
              <span className="font-medium">{indicator.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to calculate operational score
export const calculateOperationalScore = (data: {
  gpd: number;
  ca: number;
  caMeta: number;
  mortalidade: number;
  mortalidadeMeta: number;
  giroEstoque: number;
  caixa7dias: number;
}): { score: number; indicators: ScoreIndicator[] } => {
  // GPD Score (25% weight) - percentage of performance
  const gpdScore = Math.min(data.gpd, 120) / 120 * 25;

  // CA Score (25% weight) - lower is better
  const caRatio = data.caMeta / Math.max(data.ca, data.caMeta * 0.8);
  const caScore = Math.min(caRatio, 1) * 25;

  // Mortality Score (25% weight) - lower is better
  const mortRatio = data.mortalidadeMeta / Math.max(data.mortalidade, 0.01);
  const mortScore = Math.min(mortRatio, 1) * 25;

  // Stock Score (15% weight)
  let stockScore = 15;
  if (data.giroEstoque > 90) stockScore = 5;
  else if (data.giroEstoque > 60) stockScore = 10;

  // Financial Score (10% weight)
  let finScore = 10;
  if (data.caixa7dias < -10000) finScore = 2;
  else if (data.caixa7dias < 0) finScore = 5;

  const totalScore = Math.round(gpdScore + caScore + mortScore + stockScore + finScore);

  const indicators: ScoreIndicator[] = [
    {
      id: 'gpd',
      label: 'GPD',
      status: data.gpd >= 98 ? 'ok' : data.gpd >= 90 ? 'warning' : 'danger',
      value: `${Math.round(data.gpd)}%`
    },
    {
      id: 'ca',
      label: 'CA',
      status: data.ca <= data.caMeta ? 'ok' : data.ca <= data.caMeta * 1.1 ? 'warning' : 'danger',
      value: data.ca.toFixed(2)
    },
    {
      id: 'mort',
      label: 'Mort',
      status: data.mortalidade <= data.mortalidadeMeta ? 'ok' : data.mortalidade <= data.mortalidadeMeta * 1.5 ? 'warning' : 'danger',
      value: `${data.mortalidade.toFixed(2)}%`
    },
    {
      id: 'estoque',
      label: 'Estoque',
      status: data.giroEstoque <= 60 ? 'ok' : data.giroEstoque <= 90 ? 'warning' : 'danger'
    },
    {
      id: 'caixa',
      label: 'Caixa',
      status: data.caixa7dias >= 0 ? 'ok' : data.caixa7dias >= -10000 ? 'warning' : 'danger'
    }
  ];

  return { score: totalScore, indicators };
};
