-- Create table to track silo level history independently
CREATE TABLE public.historico_nivel_silo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  integrado_id UUID NOT NULL,
  
  nivel_funil NUMERIC NOT NULL CHECK (nivel_funil >= 0 AND nivel_funil <= 1),
  nivel_aneis NUMERIC NOT NULL CHECK (nivel_aneis >= 0),
  nivel_estimado_kg NUMERIC NOT NULL,
  
  nivel_esperado_kg NUMERIC, -- calculated by system based on previous level + received - consumed
  divergencia_percentual NUMERIC, -- difference between informed and expected
  divergencia_alerta BOOLEAN DEFAULT false, -- true if divergence > 20%
  
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  observacoes TEXT
);

-- Enable RLS
ALTER TABLE public.historico_nivel_silo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's silo history"
ON public.historico_nivel_silo FOR SELECT
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert silo history for their organization"
ON public.historico_nivel_silo FOR INSERT
WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update their organization's silo history"
ON public.historico_nivel_silo FOR UPDATE
USING (integrado_id = public.get_my_integrado_id());

-- Create index for faster queries
CREATE INDEX idx_historico_nivel_silo_galpao ON public.historico_nivel_silo(galpao_id);
CREATE INDEX idx_historico_nivel_silo_lote ON public.historico_nivel_silo(lote_id);
CREATE INDEX idx_historico_nivel_silo_created ON public.historico_nivel_silo(created_at DESC);