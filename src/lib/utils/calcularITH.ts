/**
 * Índice de Temperatura e Umidade (NRC, 1971)
 * ITH = T - (0.55 - 0.0055*UR) * (T - 14.5)
 * T em °C, UR em % (0-100).
 *
 * Faixas referência para aves:
 *  < 74  → conforto
 *  74-78 → atenção
 *  > 78  → estresse / crítico
 */
export function calcularITH(tempC: number, umidadePct: number): number {
  if (tempC == null || umidadePct == null) return NaN;
  const ith = tempC - (0.55 - 0.0055 * umidadePct) * (tempC - 14.5);
  return Number(ith.toFixed(2));
}

export function classificarITH(ith: number): 'conforto' | 'atencao' | 'critico' {
  if (ith >= 78) return 'critico';
  if (ith >= 74) return 'atencao';
  return 'conforto';
}
