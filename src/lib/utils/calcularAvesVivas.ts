/**
 * Unified calculation for live birds (aves vivas).
 * 
 * The correct formula is:
 *   (quantidade_aves - mortos_recebimento) - mortalidade_acumulada_diaria
 * 
 * Where mortos_recebimento includes:
 *   - quantidade_mortos (DOA)
 *   - quantidade_eliminados_locomotor
 *   - quantidade_eliminados_classificacao
 */

export interface RecebimentoData {
  quantidade_mortos?: number | null;
  quantidade_eliminados_locomotor?: number | null;
  quantidade_eliminados_classificacao?: number | null;
}

/**
 * Calculate the number of birds actually housed (after discounting DOA/eliminated at arrival).
 */
export function calcularQuantidadeAlojada(
  quantidadeAves: number,
  recebimento: RecebimentoData | null | undefined
): number {
  if (!recebimento) return quantidadeAves;
  
  const mortos = recebimento.quantidade_mortos || 0;
  const eliminadosLocomotor = recebimento.quantidade_eliminados_locomotor || 0;
  const eliminadosClassificacao = recebimento.quantidade_eliminados_classificacao || 0;
  
  return quantidadeAves - mortos - eliminadosLocomotor - eliminadosClassificacao;
}

/**
 * Calculate the total number of live birds.
 * 
 * @param quantidadeAves - Total birds ordered/placed
 * @param recebimento - Reception data (DOA, eliminated at arrival)
 * @param mortalidadeAcumulada - Accumulated daily mortality count
 */
export function calcularAvesVivas(
  quantidadeAves: number,
  recebimento: RecebimentoData | null | undefined,
  mortalidadeAcumulada: number
): number {
  const alojadas = calcularQuantidadeAlojada(quantidadeAves, recebimento);
  return Math.max(0, alojadas - mortalidadeAcumulada);
}

/**
 * Calculate total mortality from mortalidade records with nested mortalidade_itens.
 */
export function calcularMortalidadeTotal(
  mortalidadeRecords: Array<{ mortalidade_itens: Array<{ quantidade: number }> | null }> | null | undefined
): number {
  if (!mortalidadeRecords) return 0;
  
  return mortalidadeRecords.reduce((total, m) => {
    const itens = m.mortalidade_itens;
    if (!itens) return total;
    return total + itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  }, 0);
}
