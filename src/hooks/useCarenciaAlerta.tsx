import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarenciaLoteInfo {
  loteId: string;
  tratamentos: {
    id: string;
    produtoNome: string;
    dataInicio: string;
    carenciaDias: number;
    dataLiberacao: string;
    diasRestantes: number;
  }[];
  emAlerta: boolean;
}

export function useCarenciaAlertaLotes(
  loteIds: string[],
  integradoId: string | null
) {
  const [carenciaMap, setCarenciaMap] = useState<Record<string, CarenciaLoteInfo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loteIds.length || !integradoId) return;
    fetchCarencia();
  }, [loteIds, integradoId]);

  const fetchCarencia = async () => {
    setLoading(true);
    try {
      // Fetch carencia_medicamento_minimo from metas_zootecnicas
      const { data: metasData } = await supabase
        .from('metas_zootecnicas')
        .select('carencia_medicamento_minimo')
        .eq('integrado_id', integradoId!)
        .maybeSingle();

      const limiarDias = metasData?.carencia_medicamento_minimo ?? 7; // default 7 days

      // Fetch active treatments for these lotes
      const { data: tratamentos } = await supabase
        .from('tratamentos_lote')
        .select('id, lote_id, data_inicio, carencia_dias, data_liberacao_abate, produto_id, status')
        .in('lote_id', loteIds)
        .eq('status', 'ativo');

      if (!tratamentos?.length) {
        setCarenciaMap({});
        setLoading(false);
        return;
      }

      // Fetch product names
      const produtoIds = [...new Set(tratamentos.map(t => t.produto_id))];
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome')
        .in('id', produtoIds);

      const produtoNomeMap: Record<string, string> = {};
      (produtos || []).forEach(p => { produtoNomeMap[p.id] = p.nome; });

      const now = Date.now();
      const map: Record<string, CarenciaLoteInfo> = {};

      tratamentos.forEach(t => {
        const dataInicio = new Date(t.data_inicio);
        const dataLiberacao = t.data_liberacao_abate
          ? new Date(t.data_liberacao_abate)
          : new Date(dataInicio.getTime() + t.carencia_dias * 24 * 60 * 60 * 1000);

        const diasRestantes = Math.ceil((dataLiberacao.getTime() - now) / (1000 * 60 * 60 * 24));

        // Alert if withdrawal period ends within limiarDias (or already passed but treatment still active)
        if (diasRestantes <= limiarDias) {
          if (!map[t.lote_id]) {
            map[t.lote_id] = { loteId: t.lote_id, tratamentos: [], emAlerta: false };
          }
          map[t.lote_id].tratamentos.push({
            id: t.id,
            produtoNome: produtoNomeMap[t.produto_id] || 'Medicamento',
            dataInicio: t.data_inicio,
            carenciaDias: t.carencia_dias,
            dataLiberacao: dataLiberacao.toISOString().split('T')[0],
            diasRestantes,
          });
          map[t.lote_id].emAlerta = true;
        }
      });

      setCarenciaMap(map);
    } catch (err) {
      console.error('Erro ao buscar carência:', err);
    } finally {
      setLoading(false);
    }
  };

  return { carenciaMap, loading };
}
