
-- Tabela de dispositivos IoT vinculados a galpões
CREATE TABLE public.dispositivos_iot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  galpao_id UUID REFERENCES public.galpoes(id) ON DELETE SET NULL,
  device_id_ewelink TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'sonoff_th',
  marca TEXT DEFAULT 'Sonoff',
  modelo TEXT DEFAULT 'TH16',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integrado_id, device_id_ewelink)
);

-- Tabela de leituras dos sensores
CREATE TABLE public.leituras_sensores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispositivo_id UUID NOT NULL REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  temperatura_c NUMERIC(5,2),
  umidade_pct NUMERIC(5,2),
  online BOOLEAN DEFAULT true,
  raw_data JSONB,
  lido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_leituras_dispositivo_lido ON public.leituras_sensores(dispositivo_id, lido_em DESC);
CREATE INDEX idx_dispositivos_integrado ON public.dispositivos_iot(integrado_id);
CREATE INDEX idx_dispositivos_galpao ON public.dispositivos_iot(galpao_id);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_dispositivos_iot
  BEFORE UPDATE ON public.dispositivos_iot
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.dispositivos_iot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leituras_sensores ENABLE ROW LEVEL SECURITY;

-- Policies dispositivos_iot
CREATE POLICY "Users can view own org devices"
  ON public.dispositivos_iot FOR SELECT TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert own org devices"
  ON public.dispositivos_iot FOR INSERT TO authenticated
  WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update own org devices"
  ON public.dispositivos_iot FOR UPDATE TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can delete own org devices"
  ON public.dispositivos_iot FOR DELETE TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

-- Policies leituras_sensores (via dispositivo -> integrado_id)
CREATE POLICY "Users can view own org sensor readings"
  ON public.leituras_sensores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dispositivos_iot d 
    WHERE d.id = dispositivo_id AND d.integrado_id = public.get_my_integrado_id()
  ));

CREATE POLICY "Users can insert sensor readings for own org"
  ON public.leituras_sensores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dispositivos_iot d 
    WHERE d.id = dispositivo_id AND d.integrado_id = public.get_my_integrado_id()
  ));

-- Superadmin bypass
CREATE POLICY "Superadmin full access dispositivos_iot"
  ON public.dispositivos_iot FOR ALL TO authenticated
  USING (public.is_superadmin());

CREATE POLICY "Superadmin full access leituras_sensores"
  ON public.leituras_sensores FOR ALL TO authenticated
  USING (public.is_superadmin());

-- Enable realtime for sensor readings
ALTER PUBLICATION supabase_realtime ADD TABLE public.leituras_sensores;
