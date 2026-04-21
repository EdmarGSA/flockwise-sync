import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DriverIot = 'ewelink' | 'esp32_http' | 'esp32_mqtt';

interface UseDeviceControlOptions {
  integradoId: string | null;
  onSuccess?: () => void;
}

interface ToggleOptions {
  driver?: DriverIot;
  canalId?: string;
  outlet?: number | null;
}

export function useDeviceControl({ integradoId, onSuccess }: UseDeviceControlOptions) {
  const [controllingDevices, setControllingDevices] = useState<Set<string>>(new Set());

  const toggleDevice = async (
    deviceIdEwelink: string,
    currentState: string | null,
    optionsOrOutlet?: ToggleOptions | number | null,
  ) => {
    // Backwards-compat: 3rd arg used to be `outlet?: number | null`
    const opts: ToggleOptions =
      optionsOrOutlet == null || typeof optionsOrOutlet === 'number'
        ? { outlet: (optionsOrOutlet as number | null) ?? null }
        : optionsOrOutlet;

    const driver: DriverIot = opts.driver ?? 'ewelink';
    const { canalId, outlet } = opts;

    if (!integradoId) {
      toast.error('Organização não identificada');
      return;
    }

    const key =
      canalId
        ? `canal-${canalId}`
        : outlet != null
          ? `${deviceIdEwelink}-${outlet}`
          : deviceIdEwelink;

    setControllingDevices((prev) => new Set(prev).add(key));

    try {
      const newState = currentState === 'on' ? 'off' : 'on';

      // ── ESP32 HTTP bridge ──
      if (driver === 'esp32_http') {
        if (!canalId) {
          toast.error('Canal não informado para dispositivo ESP32');
          return;
        }
        const { data, error } = await supabase.functions.invoke('esp32-bridge/command', {
          body: { canalId, acao: newState === 'on' ? 'ligar' : 'desligar' },
        });
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return;
        }
        toast.success(`Comando enfileirado: ${newState === 'on' ? 'ligar' : 'desligar'}`);
        onSuccess?.();
        return;
      }

      // ── eWeLink / Sonoff (default) ──
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

  const isControlling = (deviceIdEwelink: string, outletOrCanalId?: number | string | null) => {
    if (typeof outletOrCanalId === 'string') return controllingDevices.has(`canal-${outletOrCanalId}`);
    const key = outletOrCanalId != null ? `${deviceIdEwelink}-${outletOrCanalId}` : deviceIdEwelink;
    return controllingDevices.has(key);
  };

  const fetchDeviceStatus = async (deviceIdEwelink: string, driver: DriverIot = 'ewelink') => {
    if (!integradoId) return null;
    // ESP32: state comes via telemetry into canais_dispositivo, not via remote query
    if (driver !== 'ewelink') return null;

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
      return data?.params ?? data ?? null;
    } catch {
      return null;
    }
  };

  return { toggleDevice, isControlling, fetchDeviceStatus };
}
