import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MetasZootecnicas {
  mortalidade_7_dias_alerta: number | null;
  mortalidade_14_dias_alerta: number | null;
  mortalidade_21_dias_alerta: number | null;
  mortalidade_28_dias_alerta: number | null;
  mortalidade_35_dias_alerta: number | null;
  mortalidade_42_dias_alerta: number | null;
}

function getLimiarAlerta(dias: number, metas: MetasZootecnicas): number | null {
  if (dias <= 7) return metas.mortalidade_7_dias_alerta;
  if (dias <= 14) return metas.mortalidade_14_dias_alerta;
  if (dias <= 21) return metas.mortalidade_21_dias_alerta;
  if (dias <= 28) return metas.mortalidade_28_dias_alerta;
  if (dias <= 35) return metas.mortalidade_35_dias_alerta;
  return metas.mortalidade_42_dias_alerta;
}

export interface MortalidadeLoteInfo {
  loteId: string;
  totalMortos: number;
  percentual: number;
  limiar: number | null;
  emAlerta: boolean;
}

export function useMortalidadeAlertaLotes(
  lotes: { id: string; quantidade_aves: number; data_alojamento: string | null }[],
  integradoId: string | null
) {
  const [mortalidadeMap, setMortalidadeMap] = useState<Record<string, MortalidadeLoteInfo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lotes.length || !integradoId) return;
    fetchMortalidade();
  }, [lotes, integradoId]);

  const fetchMortalidade = async () => {
    setLoading(true);
    try {
      // Fetch metas zootécnicas
      const { data: metasData } = await supabase
        .from('metas_zootecnicas')
        .select('mortalidade_7_dias_alerta, mortalidade_14_dias_alerta, mortalidade_21_dias_alerta, mortalidade_28_dias_alerta, mortalidade_35_dias_alerta, mortalidade_42_dias_alerta')
        .eq('integrado_id', integradoId)
        .maybeSingle();

      const metas: MetasZootecnicas = metasData || {
        mortalidade_7_dias_alerta: null,
        mortalidade_14_dias_alerta: null,
        mortalidade_21_dias_alerta: null,
        mortalidade_28_dias_alerta: null,
        mortalidade_35_dias_alerta: null,
        mortalidade_42_dias_alerta: null,
      };

      // Fetch all mortalidade records for these lotes
      const loteIds = lotes.map(l => l.id);
      const { data: mortalidadeData } = await supabase
        .from('mortalidade')
        .select('id, lote_id')
        .in('lote_id', loteIds);

      if (!mortalidadeData?.length) {
        setMortalidadeMap({});
        setLoading(false);
        return;
      }

      const mortalidadeIds = mortalidadeData.map(m => m.id);
      const { data: itensData } = await supabase
        .from('mortalidade_itens')
        .select('mortalidade_id, quantidade')
        .in('mortalidade_id', mortalidadeIds);

      // Sum quantities per lote
      const mortalidadeByLote: Record<string, number> = {};
      const mortIdToLote: Record<string, string> = {};
      mortalidadeData.forEach(m => { mortIdToLote[m.id] = m.lote_id; });
      
      (itensData || []).forEach(item => {
        const loteId = mortIdToLote[item.mortalidade_id];
        if (loteId) {
          mortalidadeByLote[loteId] = (mortalidadeByLote[loteId] || 0) + (item.quantidade || 0);
        }
      });

      // Build result map
      const map: Record<string, MortalidadeLoteInfo> = {};
      lotes.forEach(lote => {
        const totalMortos = mortalidadeByLote[lote.id] || 0;
        if (totalMortos === 0) return;
        
        const percentual = lote.quantidade_aves > 0 ? (totalMortos / lote.quantidade_aves) * 100 : 0;
        let limiar: number | null = null;
        let emAlerta = false;

        if (lote.data_alojamento) {
          const dias = Math.floor((Date.now() - new Date(lote.data_alojamento).getTime()) / (1000 * 60 * 60 * 24));
          limiar = getLimiarAlerta(dias, metas);
          if (limiar !== null && percentual > limiar) {
            emAlerta = true;
          }
        }

        map[lote.id] = { loteId: lote.id, totalMortos, percentual, limiar, emAlerta };
      });

      setMortalidadeMap(map);
    } catch (err) {
      console.error('Erro ao buscar mortalidade:', err);
    } finally {
      setLoading(false);
    }
  };

  return { mortalidadeMap, loading };
}
