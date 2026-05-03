import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIntegradoId } from '@/hooks/useIntegradoId';
import { toast } from 'sonner';

export interface OverrideIluminacao {
  id: string;
  canal_id: string;
  integrado_id: string;
  estado_forcado: string;
  intensidade_pct: number | null;
  motivo: string | null;
  ate_quando: string;
  created_at: string;
  created_by: string | null;
}

export interface CreateOverrideInput {
  canal_id: string;
  estado_forcado: 'on' | 'off';
  intensidade_pct?: number | null;
  ate_quando: string; // ISO
  motivo?: string | null;
}

export function useOverridesIluminacao(canalIds?: string[]) {
  const { integradoId } = useIntegradoId();
  const qc = useQueryClient();
  const key = ['overrides-iluminacao', integradoId, canalIds?.slice().sort().join(',') ?? 'all'];

  const list = useQuery({
    queryKey: key,
    enabled: !!integradoId,
    queryFn: async () => {
      let q = supabase
        .from('override_iluminacao_canal')
        .select('*')
        .eq('integrado_id', integradoId!)
        .gt('ate_quando', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (canalIds && canalIds.length) q = q.in('canal_id', canalIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OverrideIluminacao[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: CreateOverrideInput) => {
      if (!integradoId) throw new Error('Sem organização');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('override_iluminacao_canal').insert({
        canal_id: input.canal_id,
        integrado_id: integradoId,
        estado_forcado: input.estado_forcado,
        intensidade_pct: input.intensidade_pct ?? null,
        ate_quando: input.ate_quando,
        motivo: input.motivo ?? null,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Override aplicado');
      qc.invalidateQueries({ queryKey: ['overrides-iluminacao'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Falha ao aplicar override'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('override_iluminacao_canal').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Override encerrado');
      qc.invalidateQueries({ queryKey: ['overrides-iluminacao'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Falha ao encerrar override'),
  });

  return { ...list, create, remove };
}
