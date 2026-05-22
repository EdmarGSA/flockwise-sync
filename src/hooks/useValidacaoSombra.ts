import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';

interface SombraJson {
  percentis: boolean;
  modo: string;
  divergente: boolean;
  delta_temp_c: number;
}

export interface AgregadoGalpao {
  galpao_id: string;
  galpao_nome: string;
  total: number;
  divergentes: number;
  pctDivergencia: number;
  maiorDelta: number;
  prontoAtivar: boolean;
  pares: Record<string, number>; // "REAL→SOMBRA" → count
}

export interface DivergenciaLog {
  id: string;
  created_at: string;
  galpao_id: string | null;
  galpao_nome: string;
  modo_real: string;
  modo_sombra: string;
  delta_temp_c: number;
}

export function useValidacaoSombra(dias: number = 7) {
  const { integradoId } = useIntegradoId();
  const [loading, setLoading] = useState(true);
  const [agregados, setAgregados] = useState<AgregadoGalpao[]>([]);
  const [divergencias, setDivergencias] = useState<DivergenciaLog[]>([]);

  useEffect(() => {
    if (!integradoId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - dias * 86_400_000).toISOString();
      const { data: logs } = await supabase
        .from('log_decisao_clima')
        .select('id, created_at, galpao_id, estado_decidido, decisao_sombra')
        .eq('integrado_id', integradoId)
        .eq('funcao_automacao', 'climate_brain')
        .gte('created_at', since)
        .not('decisao_sombra', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000);

      const galpaoIds = Array.from(new Set((logs ?? []).map((l: any) => l.galpao_id).filter(Boolean)));
      const { data: galpoes } = galpaoIds.length
        ? await supabase.from('galpoes').select('id, nome').in('id', galpaoIds)
        : { data: [] };
      const nomePorId = new Map<string, string>((galpoes ?? []).map((g: any) => [g.id, g.nome]));

      const porGalpao = new Map<string, any>();
      const divs: DivergenciaLog[] = [];
      for (const log of (logs ?? []) as any[]) {
        const s = log.decisao_sombra as SombraJson | null;
        if (!s) continue;
        const gid = log.galpao_id || 'sem_galpao';
        const nome = nomePorId.get(gid) ?? 'Sem galpão';
        let agg = porGalpao.get(gid);
        if (!agg) {
          agg = { galpao_id: gid, galpao_nome: nome, total: 0, divergentes: 0,
                  maiorDelta: 0, pares: {} as Record<string, number> };
          porGalpao.set(gid, agg);
        }
        agg.total += 1;
        if (s.divergente) {
          agg.divergentes += 1;
          const par = `${log.estado_decidido}→${s.modo}`;
          agg.pares[par] = (agg.pares[par] ?? 0) + 1;
          if (divs.length < 50) {
            divs.push({
              id: log.id, created_at: log.created_at, galpao_id: log.galpao_id,
              galpao_nome: nome, modo_real: log.estado_decidido,
              modo_sombra: s.modo, delta_temp_c: s.delta_temp_c ?? 0,
            });
          }
        }
        if ((s.delta_temp_c ?? 0) > agg.maiorDelta) agg.maiorDelta = s.delta_temp_c ?? 0;
      }
      const lista: AgregadoGalpao[] = Array.from(porGalpao.values()).map((a: any) => {
        const pct = a.total > 0 ? (a.divergentes / a.total) * 100 : 0;
        return { ...a, pctDivergencia: pct, prontoAtivar: pct < 5 && a.total >= 50 };
      }).sort((a, b) => b.pctDivergencia - a.pctDivergencia);

      if (!cancel) {
        setAgregados(lista);
        setDivergencias(divs);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [integradoId, dias]);

  return { loading, agregados, divergencias };
}
