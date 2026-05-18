
-- 1. dispositivos_iot: zona + peso de amostragem
ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS zona text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS peso_amostragem numeric NOT NULL DEFAULT 1.0;

ALTER TABLE public.dispositivos_iot
  DROP CONSTRAINT IF EXISTS dispositivos_iot_zona_check;
ALTER TABLE public.dispositivos_iot
  ADD CONSTRAINT dispositivos_iot_zona_check
  CHECK (zona IN ('pinteiro','engorda','postura','externa','geral'));

ALTER TABLE public.dispositivos_iot
  DROP CONSTRAINT IF EXISTS dispositivos_iot_peso_amostragem_check;
ALTER TABLE public.dispositivos_iot
  ADD CONSTRAINT dispositivos_iot_peso_amostragem_check
  CHECK (peso_amostragem >= 0.0 AND peso_amostragem <= 2.0);

-- 2. lotes: override de dias de pinteiro por lote
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS dias_fim_pinteiro integer NULL;

ALTER TABLE public.lotes
  DROP CONSTRAINT IF EXISTS lotes_dias_fim_pinteiro_check;
ALTER TABLE public.lotes
  ADD CONSTRAINT lotes_dias_fim_pinteiro_check
  CHECK (dias_fim_pinteiro IS NULL OR (dias_fim_pinteiro >= 1 AND dias_fim_pinteiro <= 60));

-- 3. config_zonas_galpao: configuração por organização
CREATE TABLE IF NOT EXISTS public.config_zonas_galpao (
  integrado_id uuid PRIMARY KEY,
  dias_fim_pinteiro integer NOT NULL DEFAULT 14,
  min_minutos_sustentado integer NOT NULL DEFAULT 20,
  usar_percentis_automacao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_zonas_dias_pinteiro_check CHECK (dias_fim_pinteiro BETWEEN 1 AND 60),
  CONSTRAINT config_zonas_min_sustentado_check CHECK (min_minutos_sustentado BETWEEN 5 AND 60)
);

ALTER TABLE public.config_zonas_galpao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_zonas select" ON public.config_zonas_galpao;
CREATE POLICY "config_zonas select" ON public.config_zonas_galpao
  FOR SELECT USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "config_zonas insert" ON public.config_zonas_galpao;
CREATE POLICY "config_zonas insert" ON public.config_zonas_galpao
  FOR INSERT WITH CHECK (integrado_id = public.get_my_integrado_id());

DROP POLICY IF EXISTS "config_zonas update" ON public.config_zonas_galpao;
CREATE POLICY "config_zonas update" ON public.config_zonas_galpao
  FOR UPDATE USING (integrado_id = public.get_my_integrado_id());

DROP POLICY IF EXISTS "config_zonas delete" ON public.config_zonas_galpao;
CREATE POLICY "config_zonas delete" ON public.config_zonas_galpao
  FOR DELETE USING (integrado_id = public.get_my_integrado_id());

DROP TRIGGER IF EXISTS trg_config_zonas_updated_at ON public.config_zonas_galpao;
CREATE TRIGGER trg_config_zonas_updated_at
  BEFORE UPDATE ON public.config_zonas_galpao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
