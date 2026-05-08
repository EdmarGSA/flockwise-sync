-- Onda 5: Sensores avançados de ambiência

-- 1. Estender leituras_sensores
ALTER TABLE public.leituras_sensores
  ADD COLUMN IF NOT EXISTS nh3_ppm numeric,
  ADD COLUMN IF NOT EXISTS co2_ppm numeric,
  ADD COLUMN IF NOT EXISTS velocidade_ar_ms numeric,
  ADD COLUMN IF NOT EXISTS pressao_estatica_pa numeric,
  ADD COLUMN IF NOT EXISTS lux numeric;

-- 2. Estender dispositivos_iot com capacidades
ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS suporta_nh3 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporta_co2 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporta_anemometro boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporta_manometro boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporta_lux boolean DEFAULT false;

-- 3. Configuração de alertas de qualidade do ar
CREATE TABLE IF NOT EXISTS public.config_alertas_qualidade_ar (
  integrado_id uuid PRIMARY KEY,
  nh3_amarelo_ppm numeric NOT NULL DEFAULT 15,
  nh3_vermelho_ppm numeric NOT NULL DEFAULT 20,
  co2_amarelo_ppm numeric NOT NULL DEFAULT 2500,
  co2_vermelho_ppm numeric NOT NULL DEFAULT 3000,
  pressao_min_pa numeric NOT NULL DEFAULT 10,
  pressao_max_pa numeric NOT NULL DEFAULT 50,
  cooldown_minutos integer NOT NULL DEFAULT 15,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_alertas_qualidade_ar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage config qualidade ar"
ON public.config_alertas_qualidade_ar
FOR ALL
TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin())
WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE TRIGGER trg_config_alertas_qualidade_ar_updated
BEFORE UPDATE ON public.config_alertas_qualidade_ar
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Alertas de qualidade do ar (registro de eventos)
CREATE TABLE IF NOT EXISTS public.alertas_qualidade_ar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid,
  lote_id uuid,
  dispositivo_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('nh3_amarelo','nh3_vermelho','co2_amarelo','co2_vermelho','pressao_baixa','pressao_alta')),
  valor_lido numeric NOT NULL,
  limite_configurado numeric NOT NULL,
  severidade text NOT NULL CHECK (severidade IN ('aviso','critico')),
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_qa_integrado ON public.alertas_qualidade_ar(integrado_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_qa_galpao ON public.alertas_qualidade_ar(galpao_id, created_at DESC);

ALTER TABLE public.alertas_qualidade_ar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read alertas qa"
ON public.alertas_qualidade_ar FOR SELECT
TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "org members insert alertas qa"
ON public.alertas_qualidade_ar FOR INSERT
TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "org members update alertas qa"
ON public.alertas_qualidade_ar FOR UPDATE
TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin())
WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());