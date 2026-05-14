// Regras determinísticas para sugestão de ambiência térmica do lote.
// Padrão segue o mortality-registration-analysis-briefing: sem IA, rápido e previsível.

export interface SetpointCurva {
  temp_alvo_c: number;
  temp_min_alarme_c: number;
  temp_max_alarme_c: number;
}

export interface SensorOfflineInfo {
  nome: string;
  minutosOffline: number;
}

export interface SugestaoInput {
  mediaC: number | null;
  minC: number | null;
  maxC: number | null;
  setpoint: SetpointCurva | null;
  sensoresOffline: SensorOfflineInfo[];
}

export type StatusGeral = 'OK' | 'ATENCAO' | 'CRITICO' | 'SEM_DADOS';

export interface SugestaoOutput {
  status: StatusGeral;
  titulo: string;
  mensagem: string;
  acoes: string[];
}

export function calcularStatus(media: number | null, sp: SetpointCurva | null): StatusGeral {
  if (media == null) return 'SEM_DADOS';
  if (!sp) return 'OK';
  if (media >= sp.temp_max_alarme_c || media <= sp.temp_min_alarme_c) return 'CRITICO';
  if (Math.abs(media - sp.temp_alvo_c) > 1) return 'ATENCAO';
  return 'OK';
}

export function gerarSugestao(input: SugestaoInput): SugestaoOutput {
  const { mediaC, minC, maxC, setpoint, sensoresOffline } = input;
  const acoes: string[] = [];

  if (mediaC == null) {
    return {
      status: 'SEM_DADOS',
      titulo: 'Sem leituras recentes',
      mensagem: 'Nenhum sensor reportou temperatura nos últimos 10 minutos.',
      acoes: ['Verificar energia e conectividade dos dispositivos.'],
    };
  }

  // Offline crítico: priorizar
  const offlineCriticos = sensoresOffline.filter(s => s.minutosOffline > 30);
  if (offlineCriticos.length) {
    offlineCriticos.forEach(s => {
      acoes.push(`Sensor "${s.nome}" sem comunicação há ${Math.round(s.minutosOffline)} min — verificar energia/Wi-Fi.`);
    });
  }

  let status: StatusGeral = calcularStatus(mediaC, setpoint);
  let titulo = 'Ambiência dentro da curva';
  let mensagem = 'Nenhuma ação requerida.';

  if (setpoint && mediaC >= setpoint.temp_max_alarme_c) {
    titulo = 'Temperatura acima do limite';
    mensagem = `Média ${mediaC.toFixed(1)}°C ≥ alarme ${setpoint.temp_max_alarme_c.toFixed(1)}°C.`;
    acoes.unshift('Acionar nebulização.');
    acoes.push('Abrir cortinas para entrada de ar.');
    acoes.push('Aumentar ventilação ao máximo.');
  } else if (setpoint && mediaC <= setpoint.temp_min_alarme_c) {
    titulo = 'Temperatura abaixo do limite';
    mensagem = `Média ${mediaC.toFixed(1)}°C ≤ alarme ${setpoint.temp_min_alarme_c.toFixed(1)}°C.`;
    acoes.unshift('Verificar aquecimento (campânulas/queimadores).');
    acoes.push('Fechar cortinas para reter calor.');
    acoes.push('Revisar isolamento do galpão.');
  } else if (setpoint && Math.abs(mediaC - setpoint.temp_alvo_c) > 1) {
    titulo = 'Próximo ao limite';
    mensagem = `Média ${mediaC.toFixed(1)}°C — alvo ${setpoint.temp_alvo_c.toFixed(1)}°C. Monitorar nas próximas 2h.`;
  }

  // Amplitude: alerta independente do status térmico
  if (minC != null && maxC != null && maxC - minC > 4) {
    const ampStr = `Amplitude ${(maxC - minC).toFixed(1)}°C no dia: possível falha de automação ou cortina manual.`;
    if (status === 'OK') {
      status = 'ATENCAO';
      titulo = 'Oscilação alta hoje';
      mensagem = ampStr;
    } else {
      acoes.push(ampStr);
    }
  }

  if (status === 'OK' && offlineCriticos.length) {
    status = 'ATENCAO';
    titulo = 'Sensor sem comunicação';
    mensagem = 'Ambiência aparenta OK, mas há sensores offline.';
  }

  return { status, titulo, mensagem, acoes };
}

export const STATUS_BADGE: Record<StatusGeral, { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400' },
  ATENCAO: { label: 'Atenção', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  CRITICO: { label: 'Crítico', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  SEM_DADOS: { label: 'Sem dados', className: 'bg-muted text-muted-foreground border-border' },
};
