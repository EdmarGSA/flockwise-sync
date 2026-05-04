CREATE TABLE IF NOT EXISTS public.politica_recuperacao_iot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  escopo text NOT NULL CHECK (escopo IN ('organizacao','galpao','dispositivo')),
  galpao_id uuid REFERENCES public.galpoes(id) ON DELETE CASCADE,
  dispositivo_id uuid REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  restaurar_ultimo_estado boolean NOT NULL DEFAULT true,
  aplicar_schedule_offline boolean NOT NULL DEFAULT true,
  limite_horas_offline integer NOT NULL DEFAULT 24 CHECK (limite_horas_offline >= 0 AND limite_horas_offline <= 720),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escopo_coerencia CHECK (
    (escopo='organizacao' AND galpao_id IS NULL AND dispositivo_id IS NULL) OR
    (escopo='galpao' AND galpao_id IS NOT NULL AND dispositivo_id IS NULL) OR
    (escopo='dispositivo' AND dispositivo_id IS NOT NULL AND galpao_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_politica_org ON public.politica_recuperacao_iot(integrado_id) WHERE escopo='organizacao';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_politica_galpao ON public.politica_recuperacao_iot(galpao_id) WHERE escopo='galpao';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_politica_disp ON public.politica_recuperacao_iot(dispositivo_id) WHERE escopo='dispositivo';

ALTER TABLE public.politica_recuperacao_iot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "politica_rec_select_own_org" ON public.politica_recuperacao_iot
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "politica_rec_insert_own_org" ON public.politica_recuperacao_iot
  FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "politica_rec_update_own_org" ON public.politica_recuperacao_iot
  FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "politica_rec_delete_own_org" ON public.politica_recuperacao_iot
  FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE TRIGGER trg_politica_rec_updated_at
  BEFORE UPDATE ON public.politica_recuperacao_iot
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();