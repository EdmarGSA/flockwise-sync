import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Egg, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PosturaIndicatorsProps {
  percentualPostura: number | null;
  percentualReferencia: number | null;
  ovosAveAlojada: number | null;
  semanasVida: number;
}

export function PosturaIndicators({
  percentualPostura,
  percentualReferencia,
  ovosAveAlojada,
  semanasVida,
}: PosturaIndicatorsProps) {
  if (semanasVida < 19) {
    // Em fase de cria/recria - não há produção ainda
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Egg className="w-3 h-3" />
          Sem produção
        </Badge>
      </div>
    );
  }

  const diferenca = percentualPostura && percentualReferencia 
    ? percentualPostura - percentualReferencia 
    : null;

  const getTrendIcon = () => {
    if (!diferenca) return <Minus className="w-3 h-3" />;
    if (diferenca > 2) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (diferenca < -5) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-amber-500" />;
  };

  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!diferenca) return 'outline';
    if (diferenca > 2) return 'default';
    if (diferenca < -5) return 'destructive';
    return 'secondary';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge variant={getVariant()} className="gap-1">
              <Egg className="w-3 h-3" />
              {percentualPostura?.toFixed(1) || '-'}%
              {getTrendIcon()}
            </Badge>
            {ovosAveAlojada !== null && (
              <span className="text-xs text-muted-foreground">
                {ovosAveAlojada.toFixed(1)} ovos/ave
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>% Postura Real: {percentualPostura?.toFixed(1) || '-'}%</p>
            <p>% Postura Ref: {percentualReferencia?.toFixed(1) || '-'}%</p>
            {diferenca !== null && (
              <p className={diferenca >= 0 ? 'text-emerald-400' : 'text-destructive'}>
                Diferença: {diferenca > 0 ? '+' : ''}{diferenca.toFixed(1)}%
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
