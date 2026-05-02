/**
 * Valida o host (DDNS ou IP público) informado para um DVR.
 * Bloqueia IPs privados/loopback e hostnames locais que a edge function
 * (rodando na nuvem) não consegue alcançar.
 */
export type HostValidation = { ok: true } | { ok: false; motivo: string };

const PRIVATE_IPV4_REGEXES: RegExp[] = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // link-local
  /^0\.0\.0\.0$/,
];

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
]);

export function validateDvrHost(rawHost: string): HostValidation {
  const host = (rawHost || "").trim().toLowerCase();
  if (!host) return { ok: false, motivo: "Informe o host." };

  // Strip protocolo, path e porta acidentais
  const cleaned = host
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  if (PRIVATE_HOSTNAMES.has(cleaned)) {
    return {
      ok: false,
      motivo:
        "Endereços locais (localhost) não são acessíveis pela nuvem. Use o domínio DDNS público do DVR.",
    };
  }

  // Detecta IPv4 e bloqueia se privado
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleaned);
  if (ipv4) {
    if (PRIVATE_IPV4_REGEXES.some((r) => r.test(cleaned))) {
      return {
        ok: false,
        motivo:
          "Este é um IP da rede local da granja, inacessível pela internet. Habilite o DDNS Intelbras no DVR e use o domínio público (ex: granja.ddns-intelbras.com.br).",
      };
    }
  }

  // Hostname mínimo
  if (!ipv4 && !cleaned.includes(".")) {
    return {
      ok: false,
      motivo: "Use um domínio completo (ex: granja.ddns-intelbras.com.br) ou IP público.",
    };
  }

  return { ok: true };
}
