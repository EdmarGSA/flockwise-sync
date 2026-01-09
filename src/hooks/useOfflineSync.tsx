import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { 
  getPendingRecords, 
  getPendingCount, 
  markRecordSynced, 
  markRecordError,
  deleteSyncedRecords,
  savePendingRecord,
} from '@/services/offlineDB';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  saveOffline: (table: string, data: any, action?: 'insert' | 'update' | 'delete') => Promise<string>;
  syncAll: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error getting pending count:', error);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const saveOffline = useCallback(async (
    table: string, 
    data: any, 
    action: 'insert' | 'update' | 'delete' = 'insert'
  ): Promise<string> => {
    const id = await savePendingRecord(table, data, action);
    await refreshPendingCount();
    return id;
  }, [refreshPendingCount]);

  const syncAll = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    try {
      const pendingRecords = await getPendingRecords();

      for (const record of pendingRecords) {
        try {
          if (record.action === 'insert') {
            const { error } = await supabase
              .from(record.table as any)
              .insert(record.data);

            if (error) throw error;
          } else if (record.action === 'update') {
            const { id, ...updateData } = record.data;
            const { error } = await supabase
              .from(record.table as any)
              .update(updateData)
              .eq('id', id);

            if (error) throw error;
          } else if (record.action === 'delete') {
            const { error } = await supabase
              .from(record.table as any)
              .delete()
              .eq('id', record.data.id);

            if (error) throw error;
          }

          await markRecordSynced(record.id);
          syncedCount++;
        } catch (err: any) {
          console.error('Error syncing record:', err);
          await markRecordError(record.id, err.message);
          errorCount++;
        }
      }

      // Clean up synced records
      await deleteSyncedRecords();
      await refreshPendingCount();

      setLastSyncTime(new Date());

      if (syncedCount > 0) {
        toast.success(`${syncedCount} registro(s) sincronizado(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} registro(s) com erro`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline, pendingCount, syncAll]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    saveOffline,
    syncAll,
    refreshPendingCount,
  };
}
