import { supabase } from '@/integrations/supabase/client';
import { differenceInHours } from 'date-fns';

export interface SiloLevelInput {
  loteId: string;
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard';
  sexo: 'macho' | 'femea' | 'misto';
  diasDesdeAlojamento: number;
  avesVivas: number;
  galpaoId?: string;
}

export interface SiloLevelResult {
  nivelSilo: number;
  diasRestantes: number;
  consumoDiarioEstimado: number;
  totalRecebido: number;
  consumoEstimado: number;
  historicoNivel: {
    nivel_estimado_kg: number;
    nivel_esperado_kg: number | null;
    divergencia_percentual: number | null;
    created_at: string;
  } | null;
  consumoDesdeHistorico: number;
  racaoRecebidaDesdeHistorico: number;
  divergenciaAcumuladaKg: number;
}

/**
 * Calcula o total de ração recebida pelo lote, descontando devoluções confirmadas.
 */
function calcularTotalRecebido(
  solicitacoes: Array<{
    status: string;
    quantidade_recebida_kg: number | null;
    quantidade_devolvida_kg: number | null;
    devolucao_confirmada: boolean;
  }>
): number {
  return solicitacoes.reduce((total, s) => {
    if (s.status === 'recebido' || s.status === 'parcialmente_devolvido') {
      const rec = s.quantidade_recebida_kg || 0;
      const dev = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
      return total + (rec - dev);
    }
    return total;
  }, 0);
}

/**
 * Calcula o consumo estimado dia a dia no intervalo [diaInicio, diaFim].
 * Soma consumo_diario_racao_g de cada dia individualmente (não multiplica fixo).
 */
async function calcularConsumoIntervalo(
  linhagem: 'cobb_500' | 'ross_308' | 'hubbard',
  sexo: 'macho' | 'femea' | 'misto',
  diaInicio: number,
  diaFim: number,
  avesVivas: number
): Promise<number> {
  if (diaInicio > diaFim || diaFim < 1) return 0;

  const { data } = await supabase
    .from('desempenho_aves')
    .select('dia, consumo_diario_racao_g')
    .eq('linhagem', linhagem)
    .eq('sexo', sexo)
    .gte('dia', Math.max(1, diaInicio))
    .lte('dia', diaFim);

  if (!data || data.length === 0) return 0;

  const consumoTotalGramas = data.reduce((sum, d) => sum + d.consumo_diario_racao_g, 0);
  return (consumoTotalGramas * avesVivas) / 1000;
}

/**
 * Calcula ração recebida (líquida de devoluções) após uma data de referência.
 */
function calcularRecebidoAposData(
  solicitacoes: Array<{
    status: string;
    quantidade_recebida_kg: number | null;
    quantidade_devolvida_kg: number | null;
    devolucao_confirmada: boolean;
    data_recebimento: string | null;
  }>,
  dataReferencia: Date
): number {
  return solicitacoes
    .filter(s =>
      (s.status === 'recebido' || s.status === 'parcialmente_devolvido') &&
      s.data_recebimento &&
      new Date(s.data_recebimento) > dataReferencia
    )
    .reduce((sum, s) => {
      const rec = s.quantidade_recebida_kg || 0;
      const dev = s.devolucao_confirmada ? (s.quantidade_devolvida_kg || 0) : 0;
      return sum + (rec - dev);
    }, 0);
}

/**
 * Função unificada de cálculo de nível do silo.
 * Integra histórico manual, consumo dia a dia, e devoluções.
 */
export async function calcularNivelSilo(input: SiloLevelInput): Promise<SiloLevelResult> {
  const { loteId, linhagem, sexo, diasDesdeAlojamento, avesVivas, galpaoId } = input;

  const result: SiloLevelResult = {
    nivelSilo: 0,
    diasRestantes: 0,
    consumoDiarioEstimado: 0,
    totalRecebido: 0,
    consumoEstimado: 0,
    historicoNivel: null,
    consumoDesdeHistorico: 0,
    racaoRecebidaDesdeHistorico: 0,
    divergenciaAcumuladaKg: 0,
  };

  if (diasDesdeAlojamento <= 0 || avesVivas <= 0) return result;

  // 1. Fetch all solicitações de ração for this lote
  const { data: solicitacoes } = await supabase
    .from('solicitacoes_racao')
    .select('quantidade_recebida_kg, quantidade_devolvida_kg, devolucao_confirmada, status, data_recebimento')
    .eq('lote_id', loteId);

  const allSolicitacoes = solicitacoes || [];
  result.totalRecebido = calcularTotalRecebido(allSolicitacoes);

  // 2. Fetch consumo acumulado e diário do dia atual
  const { data: desempenho } = await supabase
    .from('desempenho_aves')
    .select('consumo_acumulado_racao_g, consumo_diario_racao_g')
    .eq('linhagem', linhagem)
    .eq('sexo', sexo)
    .lte('dia', Math.max(diasDesdeAlojamento, 1))
    .order('dia', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!desempenho) {
    result.nivelSilo = result.totalRecebido;
    return result;
  }

  result.consumoEstimado = (desempenho.consumo_acumulado_racao_g * avesVivas) / 1000;
  result.consumoDiarioEstimado = (desempenho.consumo_diario_racao_g * avesVivas) / 1000;

  // Default: nível = recebido - consumo acumulado
  let nivelSiloCalculado = result.totalRecebido - result.consumoEstimado;

  // 3. Check for historico_nivel_silo
  if (galpaoId) {
    const { data: historico } = await supabase
      .from('historico_nivel_silo')
      .select('nivel_estimado_kg, nivel_esperado_kg, divergencia_percentual, created_at')
      .eq('galpao_id', galpaoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Divergência acumulada — filtrar por lote_id
    const { data: allHistorico } = await supabase
      .from('historico_nivel_silo')
      .select('nivel_estimado_kg, nivel_esperado_kg')
      .eq('galpao_id', galpaoId)
      .eq('lote_id', loteId)
      .not('nivel_esperado_kg', 'is', null);

    result.divergenciaAcumuladaKg = (allHistorico || []).reduce((sum, h) => {
      return sum + ((h.nivel_estimado_kg || 0) - (h.nivel_esperado_kg || 0));
    }, 0);

    if (historico) {
      result.historicoNivel = historico;

      const historicoDate = new Date(historico.created_at);
      const now = new Date();
      const horasDecorridas = differenceInHours(now, historicoDate);
      const diasDecorridos = horasDecorridas / 24;

      // Calcular o dia de alojamento na data do histórico e agora
      const diaHistorico = Math.max(1, Math.round(diasDesdeAlojamento - diasDecorridos));
      const diaAtual = diasDesdeAlojamento;

      // Consumo dia a dia no intervalo (não multiplicar consumo fixo × dias)
      result.consumoDesdeHistorico = await calcularConsumoIntervalo(
        linhagem, sexo, diaHistorico, diaAtual, avesVivas
      );

      // Ração recebida após o histórico (com filtro de devoluções)
      result.racaoRecebidaDesdeHistorico = calcularRecebidoAposData(
        allSolicitacoes,
        historicoDate
      );

      nivelSiloCalculado = Math.max(
        0,
        historico.nivel_estimado_kg + result.racaoRecebidaDesdeHistorico - result.consumoDesdeHistorico
      );
    }
  }

  result.nivelSilo = nivelSiloCalculado;
  result.diasRestantes = result.consumoDiarioEstimado > 0
    ? Math.floor(result.nivelSilo / result.consumoDiarioEstimado)
    : 0;

  return result;
}
