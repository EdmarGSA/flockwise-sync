import { Badge } from '@/components/ui/badge';
import { useSiloLevel } from './NivelSiloCard';
import { useConfigSilo } from '@/hooks/useConfigSilo';
import { Package, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SiloBadgeProps {
  loteId: string;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
  galpaoId?: string;
}

export function SiloBadge({ loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas, galpaoId }: SiloBadgeProps) {
  const { config } = useConfigSilo();
  const { diasRestantes, nivelSilo, consumoDiarioEstimado, loading } = useSiloLevel(
    loteId,
    linhagem,
    sexo,
    diasDesdeAlojamento,
    avesVivas,
    galpaoId
  );

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1 animate-pulse">
        <Package className="w-3 h-3" />
        ...
      </Badge>
    );
  }

  if (diasDesdeAlojamento <= 0 || avesVivas <= 0) {
    return null;
  }

  const formatKg = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">No Silo:</span>
        <span className="font-medium">{formatKg(nivelSilo)} kg</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Consumo/dia:</span>
        <span className="font-medium">{formatKg(consumoDiarioEstimado)} kg</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Duração:</span>
        <span className="font-medium">{nivelSilo < 0 ? 'Déficit' : `${diasRestantes} dias`}</span>
      </div>
    </div>
  );

  // Critical: less than diasCritico days or deficit
  if (diasRestantes < config.diasCritico || nivelSilo < 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1 relative cursor-help">
              <AlertTriangle className="w-3 h-3" />
              {nivelSilo < 0 ? 'Déficit' : `${diasRestantes}d`}
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground"></span>
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Warning: diasCritico to diasAtencao days
  if (diasRestantes <= config.diasAtencao) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30 cursor-help">
              <Package className="w-3 h-3" />
              {diasRestantes}d
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-border">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // OK: more than diasOk days
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30 cursor-help">
            <Package className="w-3 h-3" />
            OK
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border-border">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
