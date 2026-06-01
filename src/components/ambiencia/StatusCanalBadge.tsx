import { Badge } from '@/components/ui/badge';
import type { StatusCanal } from '@/types/ambienciaLote';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface Props {
  status: StatusCanal;
  className?: string;
}

const cfg: Record<StatusCanal, { label: string; cls: string; Icon: any }> = {
  online: { label: 'ONLINE', cls: 'bg-success text-success-foreground hover:bg-success', Icon: Wifi },
  offline: { label: 'OFFLINE', cls: 'bg-destructive text-destructive-foreground hover:bg-destructive', Icon: WifiOff },
  sem_ack: { label: 'SEM ACK', cls: 'bg-warning text-warning-foreground hover:bg-warning', Icon: AlertTriangle },
};

export function StatusCanalBadge({ status, className }: Props) {
  const { label, cls, Icon } = cfg[status];
  return (
    <Badge className={`${cls} gap-1 ${className ?? ''}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
