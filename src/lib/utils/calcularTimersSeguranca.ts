/**
 * Calcula os timers de segurança (fallback offline) para um dispositivo IoT
 * baseado na idade do lote e na função de automação do dispositivo.
 * 
 * Timers são programados no firmware do Sonoff e executam localmente,
 * servindo como "piloto automático de emergência" quando não há internet.
 */

export interface TimerSeguranca {
  tipo_timer: 'aquecimento_noturno' | 'ventilacao_diurno' | 'ciclo_intermitente';
  hora_inicio: string; // HH:MM format
  hora_fim: string;
  estado_desejado: 'on' | 'off';
  intervalo_minutos?: number;
}

export interface EwelinkTimer {
  enabled: number;  // 1 = enabled
  mId: string;      // unique timer ID
  type: 'once' | 'repeat';
  at: string;       // cron-like expression for repeat
  do: { switch: 'on' | 'off' };
  coolkit_timer_type: 'repeat';
}

/**
 * Calcula timers de segurança baseado na idade do lote e função do dispositivo.
 */
export function calcularTimersSeguranca(
  idadeLoteDias: number,
  funcaoAutomacao: string,
): TimerSeguranca[] {
  if (funcaoAutomacao === 'aquecimento') {
    return calcularTimersAquecimento(idadeLoteDias);
  }
  if (funcaoAutomacao === 'ventilacao') {
    return calcularTimersVentilacao(idadeLoteDias);
  }
  return [];
}

function calcularTimersAquecimento(idade: number): TimerSeguranca[] {
  // Primeiros 7 dias: aquecimento noturno forte (18h-06h)
  if (idade <= 7) {
    return [{
      tipo_timer: 'aquecimento_noturno',
      hora_inicio: '18:00',
      hora_fim: '06:00',
      estado_desejado: 'on',
    }];
  }
  // 8-14 dias: aquecimento noturno reduzido (20h-05h)
  if (idade <= 14) {
    return [{
      tipo_timer: 'aquecimento_noturno',
      hora_inicio: '20:00',
      hora_fim: '05:00',
      estado_desejado: 'on',
    }];
  }
  // 15-21 dias: ciclo intermitente noturno (22h-04h, 30min on/30min off)
  if (idade <= 21) {
    return [{
      tipo_timer: 'ciclo_intermitente',
      hora_inicio: '22:00',
      hora_fim: '04:00',
      estado_desejado: 'on',
      intervalo_minutos: 30,
    }];
  }
  // 22+ dias: sem aquecimento (desligar sempre)
  return [{
    tipo_timer: 'aquecimento_noturno',
    hora_inicio: '00:00',
    hora_fim: '23:59',
    estado_desejado: 'off',
  }];
}

function calcularTimersVentilacao(idade: number): TimerSeguranca[] {
  // Primeiros 14 dias: sem ventilação forçada
  if (idade <= 14) {
    return [{
      tipo_timer: 'ventilacao_diurno',
      hora_inicio: '00:00',
      hora_fim: '23:59',
      estado_desejado: 'off',
    }];
  }
  // 15-21 dias: ventilação leve nas horas quentes (11h-15h)
  if (idade <= 21) {
    return [{
      tipo_timer: 'ventilacao_diurno',
      hora_inicio: '11:00',
      hora_fim: '15:00',
      estado_desejado: 'on',
    }];
  }
  // 22-28 dias: ventilação diurna expandida (10h-16h)
  if (idade <= 28) {
    return [{
      tipo_timer: 'ventilacao_diurno',
      hora_inicio: '10:00',
      hora_fim: '16:00',
      estado_desejado: 'on',
    }];
  }
  // 29+ dias: ventilação ampla (09h-18h)
  return [{
    tipo_timer: 'ventilacao_diurno',
    hora_inicio: '09:00',
    hora_fim: '18:00',
    estado_desejado: 'on',
  }];
}

/**
 * Converte TimerSeguranca para o formato de timer eWeLink (params.timers).
 * Sonoff suporta até 8 timers simultâneos.
 */
export function converterParaEwelinkTimers(
  timers: TimerSeguranca[],
  startIndex: number = 0,
): EwelinkTimer[] {
  const result: EwelinkTimer[] = [];

  for (let i = 0; i < timers.length && (startIndex + i * 2 + 1) <= 7; i++) {
    const t = timers[i];
    const [hOn, mOn] = t.hora_inicio.split(':').map(Number);
    const [hOff, mOff] = t.hora_fim.split(':').map(Number);

    // Timer to turn ON at hora_inicio
    result.push({
      enabled: 1,
      mId: `safety_on_${startIndex + i * 2}`,
      type: 'repeat',
      at: `${mOn} ${hOn} * * 0,1,2,3,4,5,6`,
      do: { switch: t.estado_desejado as 'on' | 'off' },
      coolkit_timer_type: 'repeat',
    });

    // Timer to turn OFF at hora_fim
    const offState = t.estado_desejado === 'on' ? 'off' : 'on';
    result.push({
      enabled: 1,
      mId: `safety_off_${startIndex + i * 2 + 1}`,
      type: 'repeat',
      at: `${mOff} ${hOff} * * 0,1,2,3,4,5,6`,
      do: { switch: offState as 'on' | 'off' },
      coolkit_timer_type: 'repeat',
    });
  }

  return result;
}

/**
 * Verifica se a idade do lote mudou de faixa desde a última sincronização de timers.
 * Retorna true se os timers precisam ser resincronizados.
 */
export function precisaResincronizar(idadeAtual: number, idadeAnterior: number | null): boolean {
  if (idadeAnterior === null) return true;

  const faixaAtual = getFaixaIdade(idadeAtual);
  const faixaAnterior = getFaixaIdade(idadeAnterior);

  return faixaAtual !== faixaAnterior;
}

function getFaixaIdade(idade: number): string {
  if (idade <= 7) return '1-7';
  if (idade <= 14) return '8-14';
  if (idade <= 21) return '15-21';
  if (idade <= 28) return '22-28';
  return '29+';
}
