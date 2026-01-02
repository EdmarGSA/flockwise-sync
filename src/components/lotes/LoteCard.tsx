import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bird, AlertTriangle, Package, Stethoscope, Scale, ChevronRight, Egg } from 'lucide-react';
import { SiloBadge } from './SiloBadge';
import { FasePosturaBadge } from './postura/FasePosturaBadge';

interface LoteCardProps {
  id: string;
  status: string;
  nucleoNome: string;
  galpaoNome: string;
  quantidadeAves: number;
  quantidadeAlojada: number | null;
  diasDesdeAlojamento: number;
  semanasVida: number;
  precisaPesar: boolean;
  temSolicitacaoPendente: boolean;
  pendenciasVet: number;
  isPostura: boolean;
  linhagem: string;
  sexo: string;
  percentualPostura?: number | null;
  onClick: () => void;
}

export function LoteCard({
  status,
  nucleoNome,
  galpaoNome,
  quantidadeAves,
  quantidadeAlojada,
  diasDesdeAlojamento,
  semanasVida,
  precisaPesar,
  temSolicitacaoPendente,
  pendenciasVet,
  isPostura,
  linhagem,
  sexo,
  percentualPostura,
  onClick,
}: LoteCardProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      previsao: { label: 'Previsão', variant: 'outline' },
      saiu_para_entrega: { label: 'Em Trânsito', variant: 'destructive' },
      alojado: { label: 'Alojado', variant: 'default' },
      fechado: { label: 'Fechado', variant: 'secondary' },
    };
    const config = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const avesVivas = quantidadeAlojada ?? quantidadeAves;
  const hasAlerts = precisaPesar || temSolicitacaoPendente || pendenciasVet > 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${precisaPesar ? 'border-destructive/50 bg-destructive/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          {getStatusBadge(status)}
          <div className="flex items-center gap-1">
            {precisaPesar && (
              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                <Scale className="w-3 h-3 text-destructive" />
              </div>
            )}
            {temSolicitacaoPendente && (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Package className="w-3 h-3 text-amber-600" />
              </div>
            )}
            {pendenciasVet > 0 && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center relative">
                <Stethoscope className="w-3 h-3 text-primary" />
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-destructive">{pendenciasVet}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <h3 className="font-semibold text-foreground mb-3 truncate">
          {nucleoNome} / {galpaoNome}
        </h3>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Bird className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{avesVivas.toLocaleString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2 justify-end">
            {status === 'alojado' ? (
              isPostura ? (
                <FasePosturaBadge semanasVida={semanasVida} showLabel={false} />
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {diasDesdeAlojamento}d (S{semanasVida})
                </Badge>
              )
            ) : (
              <span className="text-muted-foreground text-xs">-</span>
            )}
          </div>

          {status === 'alojado' && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <Package className="w-3 h-3" />
                  Silo
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 justify-end">
                {isPostura && percentualPostura !== null && percentualPostura !== undefined ? (
                  <div className="flex items-center gap-1">
                    <Egg className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{percentualPostura.toFixed(1)}%</span>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Action Indicator */}
        <div className="flex items-center justify-end mt-3 text-muted-foreground">
          <span className="text-xs">Ver detalhes</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  );
}
