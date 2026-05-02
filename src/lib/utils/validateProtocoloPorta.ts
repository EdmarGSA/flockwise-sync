/**
 * Valida coerência entre protocolo e porta configurada.
 * Regra: HTTP deve usar porta 80 e HTTPS deve usar porta 443 (portas padrão).
 * Retorna { ok, motivo } — motivo só preenchido quando há divergência.
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
      ok: false,
      motivo: `Protocolo ${protocolo.toUpperCase()} deve usar a porta ${padrao}. Porta informada: ${portaAtiva}.`,
    };
  }

  return { ok: true };
}
