import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { useConfigSilo } from '@/hooks/useConfigSilo';

interface LoteConsumo {
  id: string;
  nucleo?: { nome: string } | null;
  galpao?: { nome: string } | null;
  nivelSilo?: number;
  diasEstoque?: number;
  diasDesdeAlojamento?: number;
  quantidadeAlojada?: number | null;
  quantidade_aves: number;
  consumoDiarioKg?: number;
}

interface SilosMapSectionProps {
  lotes: LoteConsumo[];
  onLoteClick?: (loteId: string) => void;
  loading?: boolean;
}

export function SilosMapSection({ lotes, onLoteClick, loading }: SilosMapSectionProps) {
  const { config } = useConfigSilo();
  const lotesAtivos = lotes.filter(l => (l.diasDesdeAlojamento || 0) > 0);

  if (loading) {
    return (
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Mapa de Silos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lotesAtivos.length === 0) {
    return null;
  }

  const getSiloStatus = (diasEstoque: number, nivelSilo: number) => {
    if (nivelSilo < 0 || diasEstoque < config.diasCritico) {
      return { 
        color: 'bg-destructive', 
        barColor: 'bg-destructive',
        borderColor: 'border-destructive/50',
        label: 'Crítico',
        percentage: Math.max(0, Math.min(100, (nivelSilo / 1000) * 100))
      };
    }
    if (diasEstoque <= config.diasAtencao) {
      return { 
        color: 'bg-amber-500', 
        barColor: 'bg-amber-500',
        borderColor: 'border-amber-500/50',
        label: 'Atenção',
        percentage: Math.min(50, diasEstoque * 15)
      };
    }
    return { 
      color: 'bg-green-500', 
      barColor: 'bg-green-500',
      borderColor: 'border-green-500/30',
      label: 'OK',
      percentage: Math.min(100, diasEstoque * 10)
    };
  };

  return (
    <Card className="bg-card border-border mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Mapa de Silos
          <Badge variant="secondary" className="ml-2">{lotesAtivos.length} ativos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {lotesAtivos.map((lote) => {
              const status = getSiloStatus(lote.diasEstoque || 0, lote.nivelSilo || 0);
              const siloPercent = Math.min(100, Math.max(0, status.percentage));
              
              return (
                <Tooltip key={lote.id}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`relative cursor-pointer transition-all hover:scale-105 rounded-lg border-2 ${status.borderColor} bg-muted/30 p-1`}
                      onClick={() => onLoteClick?.(lote.id)}
                    >
                      <div className="h-16 w-full bg-muted/50 rounded-md overflow-hidden relative">
                        <div 
                          className={`absolute bottom-0 left-0 right-0 ${status.barColor} transition-all duration-500`}
                          style={{ height: `${siloPercent}%` }}
                        />
                        {(lote.diasEstoque || 0) < config.diasCritico && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangle className="w-3 h-3 text-white drop-shadow-md animate-pulse" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-center mt-1 text-muted-foreground truncate">
                        {lote.galpao?.nome || 'Galpão'}
                      </p>
                      <div className="absolute -top-1 -right-1">
                        <div className={`w-4 h-4 rounded-full ${status.color} flex items-center justify-center`}>
                          <span className="text-[8px] text-white font-bold">
                            {(lote.diasEstoque || 0) < 0 ? '!' : lote.diasEstoque || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">{lote.nucleo?.nome} - {lote.galpao?.nome}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3 h-3" />
                          <span>Nível:</span>
                        </div>
                        <span className={lote.nivelSilo && lote.nivelSilo < 0 ? 'text-destructive font-medium' : ''}>
                          {(lote.nivelSilo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                        </span>
                        
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Restante:</span>
                        </div>
                        <span className={(lote.diasEstoque || 0) < config.diasCritico ? 'text-destructive font-medium' : ''}>
                          {lote.diasEstoque || 0} dias
                        </span>
                        
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingDown className="w-3 h-3" />
                          <span>Consumo/dia:</span>
                        </div>
                        <span>{(lote.consumoDiarioKg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
                      </div>
                      <Badge variant={status.label === 'Crítico' ? 'destructive' : status.label === 'Atenção' ? 'secondary' : 'default'}>
                        {status.label}
                      </Badge>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
