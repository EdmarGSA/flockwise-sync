import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DiaRelatorio {
  data: string;
  idade_dias: number;
  semana: number;
  temp_min: number | null;
  temp_max: number | null;
  temp_med: number | null;
  umid_min: number | null;
  umid_max: number | null;
  faixa_temp_min: number;
  faixa_temp_max: number;
  fora_da_faixa: boolean;
  horas_luz: number | null;
  acender: string | null;
  apagar: string | null;
  mortalidade_natural: number;
  mortalidade_eliminada: number;
  mortalidade_total: number;
  mortalidade_pct_dia: number;
  mortalidade_pct_acum: number;
  peso_medio_kg: number | null;
  cv_pct: number | null;
  padrao_peso_kg: number | null;
  padrao_mort_acum_pct: number | null;
  delta_peso_pct: number | null;
  sensor_disponivel: boolean;
}

export interface GatilhoCritico {
  codigo: string;
  severidade: 'critico' | 'alerta' | 'info';
  titulo: string;
  acao_sugerida: string;
}

export interface RelatorioDiario {
  lote: {
    id: string;
    quantidade_aves: number;
    linhagem: string;
    sexo: string;
    data_alojamento: string;
    data_prevista_saida: string | null;
    nucleo: string;
    galpao: string;
    status: string;
  };
  devices: Array<{ id: string; nome: string; tipo: string }>;
  dias: DiaRelatorio[];
  gatilhos: GatilhoCritico[];
  tratamentos_ativos: number;
  autopsias_total: number;
  ia?: { markdown: string; cached: boolean; gerado_em: string };
}

export function useRelatorioDiarioLote(loteId: string | undefined) {
  const [data, setData] = useState<RelatorioDiario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!loteId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('relatorio-lote-diario', {
        body: { loteId }, method: 'POST',
      });
      if (err) throw err;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as RelatorioDiario);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => { carregar(); }, [carregar]);

  return { data, loading, error, recarregar: carregar };
}
