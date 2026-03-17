import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDeviceControlOptions {
  integradoId: string | null;
  onSuccess?: () => void;
}

export function useDeviceControl({ integradoId, onSuccess }: UseDeviceControlOptions) {
  const [controllingDevices, setControllingDevices] = useState<Set<string>>(new Set());

  const toggleDevice = async (
    deviceIdEwelink: string,
    currentState: string | null,
    outlet?: number | null,
  ) => {
    if (!integradoId) {
      toast.error('Organização não identificada');
      return;
    }

    const key = outlet != null ? `${deviceIdEwelink}-${outlet}` : deviceIdEwelink;
    setControllingDevices((prev) => new Set(prev).add(key));

    try {
      const newState = currentState === 'on' ? 'off' : 'on';

      const { data, error } = await supabase.functions.invoke('sync-sensors', {
        body: {
          action: 'control-device',
          integrado_id: integradoId,
          device_id: deviceIdEwelink,
          switch: newState,
          ...(outlet != null ? { outlet } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.confirmed === false) {
        if (data?.autoControlEnabled) {
          toast.warning('Comando enviado, mas o dispositivo tem automação por temperatura ativa. O estado pode não mudar até a condição ser atendida.', { duration: 6000 });
        } else {
          toast.warning('Comando enviado, mas o dispositivo não alterou o estado.');
        }
      } else {
        toast.success(`Dispositivo ${newState === 'on' ? 'ligado' : 'desligado'}`);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao controlar dispositivo';
      toast.error(message);
    } finally {
      setControllingDevices((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const isControlling = (deviceIdEwelink: string, outlet?: number | null) => {
    const key = outlet != null ? `${deviceIdEwelink}-${outlet}` : deviceIdEwelink;
    return controllingDevices.has(key);
  };

  const fetchDeviceStatus = async (deviceIdEwelink: string) => {
    if (!integradoId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('sync-sensors', {
        body: {
          action: 'device-status',
          integrado_id: integradoId,
          device_id: deviceIdEwelink,
        },
      });

      if (error) throw error;
      if (data?.error) return null;
      return data?.params || null;
    } catch {
      return null;
    }
  };

  return { toggleDevice, isControlling, fetchDeviceStatus };
}
