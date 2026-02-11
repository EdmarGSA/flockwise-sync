
CREATE TABLE public.config_validade_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  dias_validade_padrao INTEGER NOT NULL DEFAULT 30,
  dias_validade_branco INTEGER,
  dias_validade_castanho INTEGER,
  dias_validade_vermelho INTEGER,
  dias_validade_caipira INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_validade_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config" ON public.config_validade_ovos FOR SELECT USING (integrado_id = auth.uid());
CREATE POLICY "Users can insert own config" ON public.config_validade_ovos FOR INSERT WITH CHECK (integrado_id = auth.uid());
CREATE POLICY "Users can update own config" ON public.config_validade_ovos FOR UPDATE USING (integrado_id = auth.uid());

CREATE UNIQUE INDEX idx_config_validade_ovos_integrado ON public.config_validade_ovos (integrado_id);
