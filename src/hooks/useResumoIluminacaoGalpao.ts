import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  calcularEstadoIluminacao,
  idadeLoteDias,
  type FaixaIluminacao,
  type EstadoIluminacao,
} from '@/lib/utils/calcularEstadoIluminacao';

export interface ResumoIluminacao {
  loteId: string | null;
  loteCodigo: string | null;
  programaId: string | null;
  programaNome: string | null;
  fonte: 'lote' | 'org' | null;
  idadeDias: number | null;
  faixa: FaixaIluminacao | null;
  estado: EstadoIluminacao | null;
}

export function useResumoIluminacaoGalpao(galpaoId: string | null | undefined, integradoId: string | null) {
  return useQuery({
    queryKey: ['resumo-iluminacao', galpaoId, integradoId],
    enabled: !!galpaoId && !!integradoId,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ResumoIluminacao> => {
      const empty: ResumoIluminacao = {
        loteId: null, loteCodigo: null, programaId: null, programaNome: null,
        fonte: null, idadeDias: null, faixa: null, estado: null,
      };

      // 1) Lote ativo
      const { data: lote, error: loteErr } = await supabase
        .from('lotes')
        .select('id, data_alojamento, programa_iluminacao_id, integrado_id')
        .eq('galpao_id', galpaoId!)
        .eq('status', 'alojado')
        .not('data_alojamento', 'is', null)
        .maybeSingle();

      if (loteErr || !lote) return empty;

      // 2) Resolver programa: vinculado ao lote OU default da org
      let programaId = lote.programa_iluminacao_id as string | null;
      let fonte: 'lote' | 'org' = 'lote';

      if (!programaId) {
        const { data: prog } = await supabase
          .from('programa_iluminacao_lote')
          .select('id')
          .eq('integrado_id', lote.integrado_id)
          .eq('is_default', true)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle();
        programaId = prog?.id ?? null;
        fonte = 'org';
      }

      let programaNome: string | null = null;
      let faixaSel: FaixaIluminacao | null = null;
      const idade = idadeLoteDias(lote.data_alojamento);

      if (programaId) {
        const { data: prog } = await supabase
          .from('programa_iluminacao_lote')
          .select('id, nome')
          .eq('id', programaId)
          .maybeSingle();
        programaNome = prog?.nome ?? null;

        const { data: faixas } = await supabase
          .from('programa_iluminacao_faixa')
          .select('*')
          .eq('programa_id', programaId);

        faixaSel = ((faixas ?? []).find(
          (f: any) => idade >= f.dia_inicio && idade <= f.dia_fim,
        ) as unknown as FaixaIluminacao | undefined) ?? null;
      }

      const estado = faixaSel ? calcularEstadoIluminacao(faixaSel) : null;

      return {
        loteId: lote.id,
        loteCodigo: null,
        programaId,
        programaNome,
        fonte: programaId ? fonte : null,
        idadeDias: idade,
        faixa: faixaSel,
        estado,
      };
    },
  });
}

export function formatarProximoEvento(min: number | undefined, tipo?: 'acender' | 'apagar'): string | null {
  if (min == null || !tipo) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const tempo = h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
  return `${tipo === 'acender' ? 'Acende' : 'Apaga'} em ${tempo}`;
}
