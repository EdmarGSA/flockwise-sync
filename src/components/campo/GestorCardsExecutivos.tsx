import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bird, AlertTriangle, AlertCircle, TrendingDown, Scale, Clock } from 'lucide-react';
import { AnalyticsSummary } from '@/hooks/useLoteAnalytics';

interface GestorCardsExecutivosProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

export function GestorCardsExecutivos({ summary, loading }: GestorCardsExecutivosProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardContent className="pt-4 pb-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Lotes Ativos',
      value: summary.lotesAtivos,
      icon: Bird,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Em Alerta',
      value: summary.lotesAlerta,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      badge: summary.lotesAlerta > 0 ? 'warning' : null,
    },
    {
      label: 'Críticos',
      value: summary.lotesCriticos,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      badge: summary.lotesCriticos > 0 ? 'destructive' : null,
    },
    {
      label: 'Mortalidade Média',
      value: `${summary.mortalidadeMediaGeral.toFixed(2)}%`,
      icon: TrendingDown,
      color: summary.mortalidadeMediaGeral > 3 ? 'text-destructive' : summary.mortalidadeMediaGeral > 2 ? 'text-yellow-500' : 'text-green-500',
      bgColor: summary.mortalidadeMediaGeral > 3 ? 'bg-destructive/10' : summary.mortalidadeMediaGeral > 2 ? 'bg-yellow-500/10' : 'bg-green-500/10',
    },
    {
      label: 'CA Média',
      value: summary.caMediaGeral > 0 ? summary.caMediaGeral.toFixed(2) : '-',
      icon: Scale,
      color: summary.caMediaGeral > 1.8 ? 'text-destructive' : summary.caMediaGeral > 1.6 ? 'text-yellow-500' : 'text-green-500',
      bgColor: summary.caMediaGeral > 1.8 ? 'bg-destructive/10' : summary.caMediaGeral > 1.6 ? 'bg-yellow-500/10' : 'bg-green-500/10',
    },
    {
      label: 'Atraso Médio',
      value: summary.atrasoMedioGeral > 0 ? `+${summary.atrasoMedioGeral.toFixed(1)}d` : '0d',
      icon: Clock,
      color: summary.atrasoMedioGeral > 2 ? 'text-destructive' : summary.atrasoMedioGeral > 0 ? 'text-yellow-500' : 'text-green-500',
      bgColor: summary.atrasoMedioGeral > 2 ? 'bg-destructive/10' : summary.atrasoMedioGeral > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    {card.badge && (
                      <Badge variant="destructive" className="h-5 text-xs">
                        !
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
