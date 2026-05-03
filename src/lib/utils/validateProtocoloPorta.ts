/**
 * Valida a porta configurada para o protocolo informado.
 *
 * Regras:
 * - A porta deve estar entre 1 e 65535 (caso contrário `ok=false`).
 * - Portas diferentes da padrão (80 para HTTP, 443 para HTTPS) são PERMITIDAS,
 *   pois é comum redirecionar portas externas alternativas no roteador
 *   (ex.: WAN 8080 → DVR 80) quando a porta padrão já está em uso pelo
 *   próprio painel admin do roteador ou bloqueada pela operadora.
 * - Quando a porta diverge do padrão retornamos um `aviso` informativo,
 *   mas `ok` continua `true`.
 */
export type Protocolo = "http" | "https";

export interface ProtocoloPortaInput {
  protocolo: Protocolo;
  porta_http: number;
  porta_https: number;
}

export interface ProtocoloPortaResult {
  ok: boolean;
  motivo?: string;
  aviso?: string;
}

const PORTAS_PADRAO: Record<Protocolo, number> = {
  http: 80,
  https: 443,
};

export function validateProtocoloPorta(
  input: ProtocoloPortaInput,
): ProtocoloPortaResult {
  const { protocolo } = input;
  const portaAtiva = protocolo === "http" ? input.porta_http : input.porta_https;
  const padrao = PORTAS_PADRAO[protocolo];

  if (!portaAtiva || portaAtiva < 1 || portaAtiva > 65535) {
    return {
      ok: false,
      motivo: `Porta inválida. Use um valor entre 1 e 65535 (padrão ${padrao} para ${protocolo.toUpperCase()}).`,
    };
  }

  if (portaAtiva !== padrao) {
    return {
      ok: true,
      aviso: `Porta ${portaAtiva} não é a padrão de ${protocolo.toUpperCase()} (${padrao}). Confirme que o roteador encaminha esta porta externa para o DVR.`,
    };
  }

  return { ok: true };
}
