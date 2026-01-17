import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays } from 'date-fns';

export interface LoteAnalytics {
  loteId: string;
  nucleoNome: string;
  galpaoNome: string;
  linhagem: string;
  linhagemLabel: string;
  sexo: string;
  idadeDias: number;
  semana: number;
  avesAlojadas: number;
  avesVivas: number;
  
  // Mortalidade
  mortalidadeTotal: number;
  mortalidadePercent: number;
  mortalidadeMetaOk: number;
  mortalidadeMetaAlerta: number;
  mortalidadeDesvio: number; // % acima da meta
  
  // CA
  caAtual: number;
  caMetaOk: number;
  caMetaAlerta: number;
  caDesvio: number; // valor acima da meta
  
  // Peso
  pesoAtual: number;
  pesoReferencia: number;
  pesoVsMeta: number; // % diferença
  
  // Consumo
  consumoRealKg: number;
  consumoEsperadoKg: number;
  consumoDesvioPercent: number;
  
  // Ciclo
  dataPrevistaSaida: string | null;
  dataEstimadaSaida: string | null;
  atrasoDias: number;
  
  // Score e Status
  score: number; // 0-100
  status: 'ok' | 'atencao' | 'critico';
  
  // Impacto Financeiro
  excessoRacaoKg: number;
  custoExcessoCA: number;
  perdaMortalidade: number;
  impactoFinanceiroTotal: number;
  
  // Alertas
  alertas: string[];
}

export interface AnalyticsSummary {
  lotesAtivos: number;
  lotesAlerta: number;
  lotesCriticos: number;
  lotesOk: number;
  mortalidadeMediaGeral: number;
  caMediaGeral: number;
  atrasoMedioGeral: number;
  impactoFinanceiroTotal: number;
  excessoRacaoTotal: number;
  perdaMortalidadeTotal: number;
}

interface MetasZootecnicas {
  mortalidade_7_dias_ok: number | null;
  mortalidade_7_dias_alerta: number | null;
  mortalidade_14_dias_ok: number | null;
  mortalidade_14_dias_alerta: number | null;
  mortalidade_21_dias_ok: number | null;
  mortalidade_21_dias_alerta: number | null;
  mortalidade_28_dias_ok: number | null;
  mortalidade_28_dias_alerta: number | null;
  mortalidade_35_dias_ok: number | null;
  mortalidade_35_dias_alerta: number | null;
  mortalidade_42_dias_ok: number | null;
  mortalidade_42_dias_alerta: number | null;
  ca_7_dias_ok: number | null;
  ca_7_dias_alerta: number | null;
  ca_14_dias_ok: number | null;
  ca_14_dias_alerta: number | null;
  ca_21_dias_ok: number | null;
  ca_21_dias_alerta: number | null;
  ca_28_dias_ok: number | null;
  ca_28_dias_alerta: number | null;
  ca_35_dias_ok: number | null;
  ca_35_dias_alerta: number | null;
  ca_42_dias_ok: number | null;
  ca_42_dias_alerta: number | null;
}

// Preços padrão para cálculo de impacto financeiro
const PRECO_RACAO_KG = 2.50; // R$ por kg
const VALOR_PINTINHO = 3.50; // R$ por pintinho

export function useLoteAnalytics() {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<LoteAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const getLinhagemLabel = (linhagem: string) => {
    const labels: Record<string, string> = {
      cobb_500: 'Cobb 500',
      ross_308: 'Ross 308',
      hubbard: 'Hubbard',
    };
    return labels[linhagem] || linhagem;
  };

  const getMetasForDia = (metas: MetasZootecnicas | null, dia: number, tipo: 'mortalidade' | 'ca') => {
    if (!metas) return { ok: 0, alerta: 0 };
    
    const semana = Math.ceil(dia / 7);
    const semanaKey = Math.min(semana, 6) * 7;
    
    if (tipo === 'mortalidade') {
      const okKey = `mortalidade_${semanaKey}_dias_ok` as keyof MetasZootecnicas;
      const alertaKey = `mortalidade_${semanaKey}_dias_alerta` as keyof MetasZootecnicas;
      return {
        ok: (metas[okKey] as number) || 0,
        alerta: (metas[alertaKey] as number) || 0,
      };
    } else {
      const okKey = `ca_${semanaKey}_dias_ok` as keyof MetasZootecnicas;
      const alertaKey = `ca_${semanaKey}_dias_alerta` as keyof MetasZootecnicas;
      return {
        ok: (metas[okKey] as number) || 1.5,
        alerta: (metas[alertaKey] as number) || 1.8,
      };
    }
  };

  const calcularScore = (
    mortalidadePercent: number,
    mortalidadeMetaOk: number,
    mortalidadeMetaAlerta: number,
    caAtual: number,
    caMetaOk: number,
    caMetaAlerta: number,
    pesoVsMeta: number
  ): number => {
    // Normalizar desvios (0 = perfeito, 1 = muito ruim)
    const desvioMort = mortalidadeMetaAlerta > mortalidadeMetaOk 
      ? Math.min(Math.max((mortalidadePercent - mortalidadeMetaOk) / (mortalidadeMetaAlerta - mortalidadeMetaOk), 0), 1.5)
      : 0;
    
    const desvioCA = caMetaAlerta > caMetaOk
      ? Math.min(Math.max((caAtual - caMetaOk) / (caMetaAlerta - caMetaOk), 0), 1.5)
      : 0;
    
    const desvioPeso = Math.min(Math.abs(pesoVsMeta) / 20, 1); // 20% = score 0
    
    // Score = 100 - penalidades
    return Math.max(0, Math.round(100 - (desvioMort * 40) - (desvioCA * 40) - (desvioPeso * 20)));
  };

  const determinarStatus = (
    score: number,
    mortalidadePercent: number,
    mortalidadeMetaAlerta: number,
    caAtual: number,
    caMetaAlerta: number,
    atrasoDias: number
  ): 'ok' | 'atencao' | 'critico' => {
    if (score < 50 || mortalidadePercent >= mortalidadeMetaAlerta || caAtual >= caMetaAlerta || atrasoDias > 3) {
      return 'critico';
    }
    if (score < 75 || atrasoDias > 0) {
      return 'atencao';
    }
    return 'ok';
  };

  const fetchAnalytics = useCallback(async (integradoId: string) => {
    if (!integradoId) return;
    
    setLoading(true);
    
    try {
      // Buscar lotes alojados
      const { data: lotes, error: lotesError } = await supabase
        .from('lotes')
        .select(`
          id, quantidade_aves, data_alojamento, data_prevista_saida, linhagem, sexo, status,
          nucleo:nucleos(nome),
          galpao:galpoes(nome)
        `)
        .eq('integrado_id', integradoId)
        .eq('status', 'alojado');
      
      if (lotesError || !lotes) {
        console.error('Erro ao buscar lotes:', lotesError);
        setLoading(false);
        return;
      }

      // Buscar metas zootécnicas
      const { data: metas } = await supabase
        .from('metas_zootecnicas')
        .select('*')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      // Buscar dados de performance para todos os lotes
      const loteIds = lotes.map(l => l.id);
      
      const [mortalidadeRes, pesagensRes, desempenhoRes] = await Promise.all([
        supabase
          .from('mortalidade')
          .select('lote_id, mortalidade_itens(quantidade)')
          .in('lote_id', loteIds),
        supabase
          .from('pesagens')
          .select('lote_id, peso_medio_kg, consumo_real_kg, conversao_alimentar, data_pesagem')
          .in('lote_id', loteIds)
          .order('data_pesagem', { ascending: false }),
        supabase
          .from('desempenho_aves')
          .select('*')
          .order('dia', { ascending: true }),
      ]);

      const mortalidadeData = mortalidadeRes.data || [];
      const pesagensData = pesagensRes.data || [];
      const desempenhoData = desempenhoRes.data || [];

      // Processar cada lote
      const analyticsData: LoteAnalytics[] = lotes.map(lote => {
        const dataAlojamento = lote.data_alojamento ? new Date(lote.data_alojamento) : new Date();
        const idadeDias = differenceInDays(new Date(), dataAlojamento);
        const semana = Math.ceil(idadeDias / 7);

        // Mortalidade
        const mortalidadeLote = mortalidadeData.filter(m => m.lote_id === lote.id);
        const mortalidadeTotal = mortalidadeLote.reduce((acc, m) => {
          const itens = m.mortalidade_itens as { quantidade: number }[] | null;
          return acc + (itens?.reduce((sum, i) => sum + i.quantidade, 0) || 0);
        }, 0);
        const avesVivas = lote.quantidade_aves - mortalidadeTotal;
        const mortalidadePercent = lote.quantidade_aves > 0 
          ? (mortalidadeTotal / lote.quantidade_aves) * 100 
          : 0;

        // Metas de mortalidade e CA para a idade atual
        const metasMort = getMetasForDia(metas, idadeDias, 'mortalidade');
        const metasCA = getMetasForDia(metas, idadeDias, 'ca');

        // Última pesagem
        const ultimaPesagem = pesagensData.find(p => p.lote_id === lote.id);
        const pesoAtual = ultimaPesagem?.peso_medio_kg || 0;
        const caAtual = ultimaPesagem?.conversao_alimentar || 0;
        const consumoRealKg = ultimaPesagem?.consumo_real_kg || 0;

        // Peso de referência para a linhagem/sexo/dia
        const desempenhoRef = desempenhoData.find(
          d => d.dia === idadeDias && 
               d.linhagem === lote.linhagem && 
               d.sexo === lote.sexo
        );
        const pesoReferencia = desempenhoRef?.peso_g ? desempenhoRef.peso_g / 1000 : 0;
        const consumoEsperadoKg = desempenhoRef?.consumo_acumulado_racao_g 
          ? (desempenhoRef.consumo_acumulado_racao_g / 1000) * avesVivas 
          : 0;

        // Desvios
        const pesoVsMeta = pesoReferencia > 0 
          ? ((pesoAtual - pesoReferencia) / pesoReferencia) * 100 
          : 0;
        const mortalidadeDesvio = metasMort.ok > 0 
          ? ((mortalidadePercent - metasMort.ok) / metasMort.ok) * 100 
          : 0;
        const caDesvio = caAtual - metasCA.ok;
        const consumoDesvioPercent = consumoEsperadoKg > 0 
          ? ((consumoRealKg - consumoEsperadoKg) / consumoEsperadoKg) * 100 
          : 0;

        // Atraso de ciclo (estimativa baseada no peso)
        let atrasoDias = 0;
        let dataEstimadaSaida: string | null = null;
        if (lote.data_prevista_saida && pesoAtual > 0 && pesoReferencia > 0) {
          const proporcaoPeso = pesoAtual / pesoReferencia;
          if (proporcaoPeso < 0.95) {
            // Estimar atraso baseado na diferença de peso
            atrasoDias = Math.round((1 - proporcaoPeso) * 7); // Aproximadamente 1 dia por 10% de atraso
            dataEstimadaSaida = addDays(new Date(lote.data_prevista_saida), atrasoDias).toISOString();
          }
        }

        // Calcular score
        const score = calcularScore(
          mortalidadePercent,
          metasMort.ok,
          metasMort.alerta,
          caAtual,
          metasCA.ok,
          metasCA.alerta,
          pesoVsMeta
        );

        // Determinar status
        const status = determinarStatus(
          score,
          mortalidadePercent,
          metasMort.alerta,
          caAtual,
          metasCA.alerta,
          atrasoDias
        );

        // Impacto financeiro
        const excessoRacaoKg = caDesvio > 0 ? caDesvio * avesVivas * pesoAtual : 0;
        const custoExcessoCA = excessoRacaoKg * PRECO_RACAO_KG;
        const mortalidadeExcesso = mortalidadePercent > metasMort.ok 
          ? (mortalidadePercent - metasMort.ok) / 100 * lote.quantidade_aves 
          : 0;
        const perdaMortalidade = mortalidadeExcesso * VALOR_PINTINHO;

        // Gerar alertas
        const alertas: string[] = [];
        if (mortalidadePercent > metasMort.alerta) {
          alertas.push(`Mortalidade ${mortalidadePercent.toFixed(2)}% (meta ${metasMort.ok.toFixed(2)}%) - desvio +${mortalidadeDesvio.toFixed(0)}%`);
        } else if (mortalidadePercent > metasMort.ok) {
          alertas.push(`Mortalidade em atenção: ${mortalidadePercent.toFixed(2)}% (meta ${metasMort.ok.toFixed(2)}%)`);
        }
        if (caAtual > metasCA.alerta) {
          alertas.push(`CA atual ${caAtual.toFixed(2)} (esperado ${metasCA.ok.toFixed(2)}) - +R$ ${custoExcessoCA.toFixed(0)} em ração`);
        } else if (caAtual > metasCA.ok) {
          alertas.push(`CA em atenção: ${caAtual.toFixed(2)} (esperado ${metasCA.ok.toFixed(2)})`);
        }
        if (pesoVsMeta < -10) {
          alertas.push(`Peso ${Math.abs(pesoVsMeta).toFixed(0)}% abaixo da referência`);
        }
        if (atrasoDias > 0) {
          alertas.push(`Atraso estimado de +${atrasoDias} dias`);
        }

        return {
          loteId: lote.id,
          nucleoNome: (lote.nucleo as { nome: string } | null)?.nome || 'N/A',
          galpaoNome: (lote.galpao as { nome: string } | null)?.nome || 'N/A',
          linhagem: lote.linhagem || '',
          linhagemLabel: getLinhagemLabel(lote.linhagem || ''),
          sexo: lote.sexo || 'misto',
          idadeDias,
          semana,
          avesAlojadas: lote.quantidade_aves,
          avesVivas,
          mortalidadeTotal,
          mortalidadePercent,
          mortalidadeMetaOk: metasMort.ok,
          mortalidadeMetaAlerta: metasMort.alerta,
          mortalidadeDesvio,
          caAtual,
          caMetaOk: metasCA.ok,
          caMetaAlerta: metasCA.alerta,
          caDesvio,
          pesoAtual,
          pesoReferencia,
          pesoVsMeta,
          consumoRealKg,
          consumoEsperadoKg,
          consumoDesvioPercent,
          dataPrevistaSaida: lote.data_prevista_saida,
          dataEstimadaSaida,
          atrasoDias,
          score,
          status,
          excessoRacaoKg,
          custoExcessoCA,
          perdaMortalidade,
          impactoFinanceiroTotal: custoExcessoCA + perdaMortalidade,
          alertas,
        };
      });

      // Ordenar por score (menor primeiro = mais crítico)
      analyticsData.sort((a, b) => a.score - b.score);
      setAnalytics(analyticsData);

      // Calcular sumário
      const lotesOk = analyticsData.filter(l => l.status === 'ok').length;
      const lotesAlerta = analyticsData.filter(l => l.status === 'atencao').length;
      const lotesCriticos = analyticsData.filter(l => l.status === 'critico').length;

      const totalAves = analyticsData.reduce((acc, l) => acc + l.avesAlojadas, 0);
      const mortalidadeMediaGeral = totalAves > 0
        ? analyticsData.reduce((acc, l) => acc + (l.mortalidadePercent * l.avesAlojadas), 0) / totalAves
        : 0;

      const lotesComCA = analyticsData.filter(l => l.caAtual > 0);
      const caMediaGeral = lotesComCA.length > 0
        ? lotesComCA.reduce((acc, l) => acc + l.caAtual, 0) / lotesComCA.length
        : 0;

      const lotesComAtraso = analyticsData.filter(l => l.atrasoDias > 0);
      const atrasoMedioGeral = lotesComAtraso.length > 0
        ? lotesComAtraso.reduce((acc, l) => acc + l.atrasoDias, 0) / lotesComAtraso.length
        : 0;

      setSummary({
        lotesAtivos: analyticsData.length,
        lotesOk,
        lotesAlerta,
        lotesCriticos,
        mortalidadeMediaGeral,
        caMediaGeral,
        atrasoMedioGeral,
        impactoFinanceiroTotal: analyticsData.reduce((acc, l) => acc + l.impactoFinanceiroTotal, 0),
        excessoRacaoTotal: analyticsData.reduce((acc, l) => acc + l.excessoRacaoKg, 0),
        perdaMortalidadeTotal: analyticsData.reduce((acc, l) => acc + l.perdaMortalidade, 0),
      });

    } catch (error) {
      console.error('Erro ao calcular analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    analytics,
    summary,
    fetchAnalytics,
  };
}
