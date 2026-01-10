import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Loader2, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showSyncButton?: boolean;
}

export default function ConnectionStatus({ 
  className,
  showSyncButton = true 
}: ConnectionStatusProps) {
  const { isOnline, pendingCount, isSyncing, syncAll } = useOfflineSync();

  // Only show when offline or has pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 flex-wrap",
      !isOnline && "bg-destructive/10 -mx-4 px-4 py-2 border-b border-destructive/20",
      className
    )}>
      {/* Connection Status */}
      {!isOnline && (
        <Badge
          variant="destructive"
          className="gap-1.5 py-1.5"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline</span>
        </Badge>
      )}

      {/* Pending Count */}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1.5 py-1.5">
          <CloudOff className="w-3.5 h-3.5" />
          {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
        </Badge>
      )}

      {/* Sync Button */}
      {showSyncButton && pendingCount > 0 && isOnline && (
        <Button
          variant="outline"
          size="sm"
          onClick={syncAll}
          disabled={isSyncing}
          className="gap-1.5 h-8 ml-auto"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
