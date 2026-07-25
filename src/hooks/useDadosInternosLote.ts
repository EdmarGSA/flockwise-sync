import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosInternos } from '@/lib/utils/fechamentoRipi';

/**
 * Consolida os dados que o próprio sistema registrou para o lote:
 * ração recebida, mortalidade acumulada, última pesagem e aves vivas.
 * Usado para comparar com o resultado oficial do frigorífico (RIPI).
 */
export function useDadosInternosLote(loteId: string | null, quantidadeAlojada: number, enabled = true) {
  const [dados, setDados] = useState<DadosInternos | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !loteId) return;
    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      try {
        const [racaoRes, mortRes, recebRes, pesagensRes] = await Promise.all([
          supabase
            .from('solicitacoes_racao')
            .select('quantidade_recebida_kg, quantidade_solicitada_kg, quantidade_devolvida_kg, status')
            .eq('lote_id', loteId),
          supabase
            .from('mortalidade')
            .select('id, mortalidade_itens(quantidade)')
            .eq('lote_id', loteId),
          supabase
            .from('recebimento_lotes')
            .select('quantidade_mortos, quantidade_eliminados')
            .eq('lote_id', loteId),
          supabase
            .from('pesagens')
            .select('data_pesagem, pesagem_itens(quantidade_aves, peso_liquido_kg)')
            .eq('lote_id', loteId)
            .order('data_pesagem', { ascending: false })
            .limit(1),
        ]);

        if (cancelado) return;

        // Ração: prioriza o recebido; cai para o solicitado quando não confirmado
        let racaoConsumidaKg: number | null = null;
        if (racaoRes.data && racaoRes.data.length > 0) {
          racaoConsumidaKg = racaoRes.data.reduce((acc, r) => {
            const recebida = Number(r.quantidade_recebida_kg ?? r.quantidade_solicitada_kg ?? 0);
            const devolvida = Number(r.quantidade_devolvida_kg ?? 0);
            return acc + recebida - devolvida;
          }, 0);
        }

        // Mortalidade acumulada + perdas de recebimento
        let mortos = 0;
        (mortRes.data ?? []).forEach((m: any) => {
          (m.mortalidade_itens ?? []).forEach((i: any) => {
            mortos += Number(i.quantidade) || 0;
          });
        });
        let perdaInicial = 0;
        (recebRes.data ?? []).forEach((r: any) => {
          perdaInicial += (Number(r.quantidade_mortos) || 0) + (Number(r.quantidade_eliminados) || 0);
        });

        const totalPerdas = mortos + perdaInicial;
        const mortalidadePercentual = quantidadeAlojada > 0 ? (totalPerdas / quantidadeAlojada) * 100 : null;
        const avesVivas = quantidadeAlojada > 0 ? quantidadeAlojada - totalPerdas : null;

        // Peso médio da última pesagem
        let pesoMedioKg: number | null = null;
        const ultima = pesagensRes.data?.[0] as any;
        if (ultima?.pesagem_itens?.length) {
          let qtd = 0;
          let peso = 0;
          ultima.pesagem_itens.forEach((i: any) => {
            qtd += Number(i.quantidade_aves) || 0;
            peso += Number(i.peso_liquido_kg) || 0;
          });
          if (qtd > 0) pesoMedioKg = peso / qtd;
        }

        setDados({ racaoConsumidaKg, mortalidadePercentual, pesoMedioKg, avesVivas });
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [loteId, quantidadeAlojada, enabled]);

  return { dados, loading };
}
