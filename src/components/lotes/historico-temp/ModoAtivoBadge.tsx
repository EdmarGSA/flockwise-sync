import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface Props {
  zonaAtiva: string;
  sensoresUsados: number;
  sensoresTotal: number;
}

const labelZona: Record<string, string> = {
  pinteiro: 'Modo pinteiro',
  engorda: 'Modo engorda',
  postura: 'Modo postura',
  externa: 'Externa',
  geral: 'Geral',
};

export function ModoAtivoBadge({ zonaAtiva, sensoresUsados, sensoresTotal }: Props) {
  // Só mostra se houver sensores fora da zona ativa (faz diferença prática)
  if (sensoresTotal <= sensoresUsados) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 cursor-help">
            {labelZona[zonaAtiva] ?? zonaAtiva} — {sensoresUsados}/{sensoresTotal} sensores
            <Info className="w-3 h-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          Apenas os sensores da zona ativa entram na média e nos alertas. Sensores em
          outras zonas (ex.: fora do pinteiro) continuam visíveis, mas são ignorados
          para evitar distorção quando as aves estão confinadas em parte do galpão.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
