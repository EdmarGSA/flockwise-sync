CREATE TABLE public.nucleo_alertas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id uuid NOT NULL,
  nucleo_id uuid REFERENCES public.nucleos(id) ON DELETE CASCADE,
  temp_max_critico numeric,
  temp_min_critico numeric,
  ith_max_critico numeric,
  vento_max_kmh numeric DEFAULT 50,
  prob_chuva_min_pct numeric DEFAULT 70,
  habilitar_calor boolean NOT NULL DEFAULT true,
  habilitar_frio boolean NOT NULL DEFAULT true,
  habilitar_ith boolean NOT NULL DEFAULT true,
  habilitar_vento boolean NOT NULL DEFAULT true,
  habilitar_chuva boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT uniq_nucleo_alertas_config UNIQUE (integrado_id, nucleo_id)
);

CREATE INDEX idx_nucleo_alertas_config_org ON public.nucleo_alertas_config(integrado_id);

ALTER TABLE public.nucleo_alertas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select org alertas config"
  ON public.nucleo_alertas_config FOR SELECT
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "insert org alertas config"
  ON public.nucleo_alertas_config FOR INSERT
  WITH CHECK (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "update org alertas config"
  ON public.nucleo_alertas_config FOR UPDATE
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "delete org alertas config"
  ON public.nucleo_alertas_config FOR DELETE
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE TRIGGER trg_nucleo_alertas_config_updated
  BEFORE UPDATE ON public.nucleo_alertas_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();