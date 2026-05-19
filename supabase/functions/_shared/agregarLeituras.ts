/**
 * Utilitários estatísticos robustos para agregação de leituras de sensores.
 * Substitui o uso ingênuo de min/max absolutos, que sofrem com picos curtos
 * (porta aberta, descarga de ração, falha já corrigida).
 */

export function mediana(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Percentil interpolado (p entre 0 e 100). */
export function percentil(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Remove outliers via método IQR (Tukey 1.5×).
 * Útil para evitar que um único spike domine a média.
 */
export function removerOutliersIQR(values: number[], k = 1.5): number[] {
  if (values.length < 4) return [...values];
  const q1 = percentil(values, 25)!;
  const q3 = percentil(values, 75)!;
  const iqr = q3 - q1;
  const lo = q1 - k * iqr;
  const hi = q3 + k * iqr;
  return values.filter(v => v >= lo && v <= hi);
}

export interface LeituraTemporal {
  valor: number;
  ts: string; // ISO
}

/**
 * Min/Max sustentado: só conta um pico se ele se manteve fora da normalidade
 * por no mínimo `minMinutos` consecutivos (gap máximo entre leituras = 10 min).
 * Se nenhum pico for sustentado, retorna a mediana como fallback estável.
 */
export function minMaxSustentado(
  leituras: LeituraTemporal[],
  minMinutos = 20
): { min: number | null; max: number | null; horarioMin: string | null; horarioMax: string | null } {
  if (!leituras.length) {
    return { min: null, max: null, horarioMin: null, horarioMax: null };
  }
  const ordenadas = [...leituras].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );
  const med = mediana(ordenadas.map(l => l.valor))!;

  // Detecta sequências consecutivas abaixo da mediana e acima dela,
  // retornando o valor extremo que se manteve por >= minMinutos.
  const findExtremo = (cmp: (v: number) => boolean): { valor: number; ts: string } | null => {
    let inicio: number | null = null;
    let extremoVal: number | null = null;
    let extremoTs: string | null = null;
    let melhor: { valor: number; ts: string } | null = null;
    const flush = (fimIdx: number) => {
      if (inicio == null || extremoVal == null || extremoTs == null) return;
      const durMs = new Date(ordenadas[fimIdx].ts).getTime() - new Date(ordenadas[inicio].ts).getTime();
      if (durMs >= minMinutos * 60_000) {
        if (
          !melhor ||
          (cmp(extremoVal - melhor.valor) // mantém o mais extremo na direção desejada
            )
        ) {
          melhor = { valor: extremoVal, ts: extremoTs };
        }
      }
      inicio = null; extremoVal = null; extremoTs = null;
    };
    for (let i = 0; i < ordenadas.length; i++) {
      const l = ordenadas[i];
      if (cmp(l.valor - med)) {
        if (inicio == null) { inicio = i; extremoVal = l.valor; extremoTs = l.ts; }
        else if (cmp(l.valor - extremoVal!)) { extremoVal = l.valor; extremoTs = l.ts; }
        // gap > 10 min interrompe a sequência
        if (i > inicio && new Date(l.ts).getTime() - new Date(ordenadas[i - 1].ts).getTime() > 10 * 60_000) {
          flush(i - 1);
          inicio = i; extremoVal = l.valor; extremoTs = l.ts;
        }
      } else {
        flush(i - 1);
      }
    }
    flush(ordenadas.length - 1);
    return melhor;
  };

  const minExt = findExtremo(diff => diff < 0); // valores < mediana
  const maxExt = findExtremo(diff => diff > 0); // valores > mediana

  return {
    min: minExt?.valor ?? med,
    max: maxExt?.valor ?? med,
    horarioMin: minExt?.ts ?? null,
    horarioMax: maxExt?.ts ?? null,
  };
}

/**
 * Tempo total (em minutos) em que as leituras ficaram fora da faixa [min, max].
 * Aproxima cada leitura como ocupando o intervalo até a próxima leitura
 * (limitado a 15 min, para não inflar quando há gaps grandes).
 */
export function tempoForaFaixa(
  leituras: LeituraTemporal[],
  faixaMin: number,
  faixaMax: number
): number {
  if (leituras.length < 2) return 0;
  const ordenadas = [...leituras].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );
  let totalMin = 0;
  for (let i = 0; i < ordenadas.length - 1; i++) {
    const l = ordenadas[i];
    if (l.valor < faixaMin || l.valor > faixaMax) {
      const deltaMs = new Date(ordenadas[i + 1].ts).getTime() - new Date(l.ts).getTime();
      const deltaMin = Math.min(15, deltaMs / 60_000);
      totalMin += Math.max(0, deltaMin);
    }
  }
  return Math.round(totalMin);
}

export type ZonaSensor = 'pinteiro' | 'engorda' | 'postura' | 'externa' | 'geral';

/**
 * Resolve quais zonas devem ser consideradas ativas dada a idade do lote
 * e o tipo de produção. Sensores em zonas inativas são exibidos mas não
 * entram na média/decisão.
 */
export function zonasAtivasPara(
  idadeDias: number | null,
  tipoProducao: string | null,
  diasFimPinteiro: number
): ZonaSensor[] {
  if (idadeDias == null) return ['pinteiro', 'engorda', 'postura', 'geral'];
  if (idadeDias <= diasFimPinteiro) return ['pinteiro', 'geral'];
  if (tipoProducao === 'postura') return ['postura', 'geral'];
  return ['engorda', 'geral'];
}
