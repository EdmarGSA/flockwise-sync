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
  const raw = input ?? ({} as ProtocoloPortaInput);
  // Normaliza protocolo para lowercase para aceitar 'HTTP', 'Https', etc.
  const protocoloNorm = (
    typeof raw.protocolo === "string" ? raw.protocolo.toLowerCase() : raw.protocolo
  ) as Protocolo | undefined;
  const padrao = protocoloNorm ? PORTAS_PADRAO[protocoloNorm] : undefined;

  if (!padrao) {
    return {
      ok: false,
      motivo: `Protocolo inválido. Use 'http' ou 'https'.`,
    };
  }

  const portaRaw: unknown = protocoloNorm === "http" ? raw.porta_http : raw.porta_https;
  const portaAtiva = typeof portaRaw === "number" ? portaRaw : Number(portaRaw);

  if (
    portaRaw === null ||
    portaRaw === undefined ||
    portaRaw === "" ||
    !Number.isFinite(portaAtiva) ||
    portaAtiva < 1 ||
    portaAtiva > 65535
  ) {
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
