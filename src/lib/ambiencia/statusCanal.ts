import type { CanalDispositivo, DispositivoIot, StatusCanal } from '@/types/ambienciaLote';

const ONLINE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const SEM_ACK_WINDOW_MS = 90 * 1000; // 90 s

export function isDispositivoOnline(dev: Pick<DispositivoIot, 'online' | 'ultimo_sync'>): boolean {
  if (!dev.online) return false;
  if (!dev.ultimo_sync) return false;
  return Date.now() - new Date(dev.ultimo_sync).getTime() < ONLINE_WINDOW_MS;
}

/**
 * Status real-time do canal — combina status do dispositivo + ACK do firmware.
 * SEM ACK: comando enviado há > 90s, e estado_atual não bate com último_estado_persistido
 * (ou nunca recebeu ACK).
 */
export function statusCanal(
  canal: CanalDispositivo,
  dev: Pick<DispositivoIot, 'online' | 'ultimo_sync'> | undefined,
): StatusCanal {
  if (!dev || !isDispositivoOnline(dev)) return 'offline';
  if (!canal.ultimo_comando_em) return 'online';
  const tsCmd = new Date(canal.ultimo_comando_em).getTime();
  const ackTs = canal.ultimo_estado_persistido_em
    ? new Date(canal.ultimo_estado_persistido_em).getTime()
    : 0;
  const passou = Date.now() - tsCmd > SEM_ACK_WINDOW_MS;
  // Sem ACK = comando antigo, e ACK não chegou depois do comando
  if (passou && ackTs < tsCmd) return 'sem_ack';
  // ACK chegou mas valor diverge -> ainda em movimento? só marcamos sem_ack se passou.
  if (
    passou &&
    canal.ultimo_estado_persistido &&
    canal.estado_atual &&
    canal.ultimo_estado_persistido !== canal.estado_atual
  ) {
    return 'sem_ack';
  }
  return 'online';
}

export function minutosDesde(ts: string | null | undefined): number | null {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}
