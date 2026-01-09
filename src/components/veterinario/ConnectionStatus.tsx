import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Loader2, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showSyncButton?: boolean;
}

export default function ConnectionStatus({ 
  className,
  showSyncButton = true 
}: ConnectionStatusProps) {
  const { isOnline, pendingCount, isSyncing, syncAll, lastSyncTime } = useOfflineSync();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "gap-1.5 transition-all",
          isOnline ? "bg-green-600 hover:bg-green-700" : ""
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Offline</span>
          </>
        )}
      </Badge>

      {pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1.5">
          <CloudOff className="w-3 h-3" />
          {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
        </Badge>
      )}

      {pendingCount === 0 && isOnline && lastSyncTime && (
        <Badge variant="outline" className="gap-1.5 text-green-600 border-green-600/30">
          <Cloud className="w-3 h-3" />
          <span className="hidden sm:inline">Sincronizado</span>
        </Badge>
      )}

      {showSyncButton && pendingCount > 0 && isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={syncAll}
          disabled={isSyncing}
          className="gap-1.5 h-7"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Sincronizando...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Sincronizar</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
