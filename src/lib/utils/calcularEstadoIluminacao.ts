/**
 * Lógica compartilhada (frontend + edge function) para decidir o estado
 * de um canal de iluminação em um determinado instante, dado o programa
 * de fotoperíodo do lote e a idade das aves.
 */

export interface BlocoLuz {
  acender: string; // "HH:MM"
  apagar: string;  // "HH:MM"
  intensidade_pct?: number;
}

export interface FaixaIluminacao {
  dia_inicio: number;
  dia_fim: number;
  horas_luz: number;
  blocos: BlocoLuz[];
  ramp_up_min: number;
  ramp_down_min: number;
  intensidade_pct: number;
}

export interface EstadoIluminacao {
  estado: 'on' | 'off';
  intensidade_pct: number;
  motivo: string;
  /** próximo evento (acender/apagar) em minutos a partir de agora */
  proximo_evento_min?: number;
  proximo_evento_tipo?: 'acender' | 'apagar';
}

const TZ = 'America/Sao_Paulo';

/** Minutos desde 00:00 no fuso configurado */
export function minutosNoDia(date: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

function hhmmToMin(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function selecionarFaixa(faixas: FaixaIluminacao[], idadeDias: number): FaixaIluminacao | null {
  return faixas.find((f) => idadeDias >= f.dia_inicio && idadeDias <= f.dia_fim) ?? null;
}

/**
 * Decide se um bloco está "aceso" no instante atual,
 * considerando ramp-up (antes do acender) e ramp-down (antes do apagar).
 * Retorna intensidade efetiva.
 */
function avaliarBloco(
  bloco: BlocoLuz,
  agoraMin: number,
  rampUp: number,
  rampDown: number,
  intensidadeMax: number,
): { ligado: boolean; intensidade: number } {
  const acender = hhmmToMin(bloco.acender);
  const apagar = hhmmToMin(bloco.apagar);
  const intMax = Math.min(bloco.intensidade_pct ?? intensidadeMax, intensidadeMax);

  // Bloco que cruza meia-noite: acender > apagar
  const cruza = acender > apagar || apagar === acender;

  const dentro = (start: number, end: number) =>
    cruza ? agoraMin >= start || agoraMin < end : agoraMin >= start && agoraMin < end;

  if (!dentro(acender, apagar)) {
    // pode estar no ramp-up (antes do acender)
    if (rampUp > 0) {
      const inicioRamp = (acender - rampUp + 1440) % 1440;
      if (cruza
        ? (agoraMin >= inicioRamp && agoraMin < acender) || (agoraMin >= inicioRamp || agoraMin < acender)
        : (agoraMin >= inicioRamp && agoraMin < acender)) {
        const progresso = (agoraMin - inicioRamp + 1440) % 1440 / rampUp;
        return { ligado: true, intensidade: Math.round(intMax * progresso) };
      }
    }
    return { ligado: false, intensidade: 0 };
  }

  // Dentro do bloco: verificar ramp-down (perto do apagar)
  if (rampDown > 0) {
    const inicioRampDown = (apagar - rampDown + 1440) % 1440;
    const noRampDown = cruza
      ? (inicioRampDown < apagar
          ? agoraMin >= inicioRampDown && agoraMin < apagar
          : agoraMin >= inicioRampDown || agoraMin < apagar)
      : agoraMin >= inicioRampDown && agoraMin < apagar;
    if (noRampDown) {
      const progresso = 1 - ((agoraMin - inicioRampDown + 1440) % 1440) / rampDown;
      return { ligado: true, intensidade: Math.max(1, Math.round(intMax * progresso)) };
    }
  }

  return { ligado: true, intensidade: intMax };
}

export function calcularEstadoIluminacao(
  faixa: FaixaIluminacao,
  agora: Date = new Date(),
): EstadoIluminacao {
  const agoraMin = minutosNoDia(agora);
  const blocos = (faixa.blocos?.length ? faixa.blocos : [{ acender: '00:00', apagar: '00:00' }]) as BlocoLuz[];

  let melhor: { ligado: boolean; intensidade: number } = { ligado: false, intensidade: 0 };
  for (const b of blocos) {
    const r = avaliarBloco(b, agoraMin, faixa.ramp_up_min, faixa.ramp_down_min, faixa.intensidade_pct);
    if (r.ligado && r.intensidade > melhor.intensidade) melhor = r;
  }

  // Calcular próximo evento
  let proximoMin = Infinity;
  let proximoTipo: 'acender' | 'apagar' = 'acender';
  for (const b of blocos) {
    const eventos: Array<{ min: number; tipo: 'acender' | 'apagar' }> = [
      { min: hhmmToMin(b.acender), tipo: 'acender' },
      { min: hhmmToMin(b.apagar), tipo: 'apagar' },
    ];
    for (const e of eventos) {
      const delta = (e.min - agoraMin + 1440) % 1440;
      if (delta > 0 && delta < proximoMin) {
        proximoMin = delta;
        proximoTipo = e.tipo;
      }
    }
  }

  return {
    estado: melhor.ligado ? 'on' : 'off',
    intensidade_pct: melhor.intensidade,
    motivo: `idade ${faixa.dia_inicio}-${faixa.dia_fim}d, ${melhor.ligado ? `aceso ${melhor.intensidade}%` : 'escotofase'}`,
    proximo_evento_min: proximoMin === Infinity ? undefined : proximoMin,
    proximo_evento_tipo: proximoMin === Infinity ? undefined : proximoTipo,
  };
}

/** Idade em dias desde alojamento (truncado) */
export function idadeLoteDias(dataAlojamento: string | Date): number {
  const ini = typeof dataAlojamento === 'string' ? new Date(dataAlojamento) : dataAlojamento;
  const ms = Date.now() - ini.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}
