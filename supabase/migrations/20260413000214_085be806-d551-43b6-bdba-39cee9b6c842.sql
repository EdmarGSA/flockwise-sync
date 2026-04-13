
-- Create enum for timer types
CREATE TYPE public.tipo_timer_seguranca AS ENUM ('aquecimento_noturno', 'ventilacao_diurno', 'ciclo_intermitente');

-- Create table for safety timers
CREATE TABLE public.timers_seguranca_iot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dispositivo_id UUID NOT NULL REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  tipo_timer tipo_timer_seguranca NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  estado_desejado TEXT NOT NULL DEFAULT 'on' CHECK (estado_desejado IN ('on', 'off')),
  intervalo_minutos INTEGER,
  idade_lote_dias INTEGER NOT NULL,
  sincronizado BOOLEAN NOT NULL DEFAULT false,
  sincronizado_em TIMESTAMPTZ,
  timer_index_ewelink INTEGER CHECK (timer_index_ewelink >= 0 AND timer_index_ewelink <= 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timers_seguranca_iot ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view timers from their organization"
ON public.timers_seguranca_iot
FOR SELECT
TO authenticated
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert timers for their organization"
ON public.timers_seguranca_iot
FOR INSERT
TO authenticated
WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update timers from their organization"
ON public.timers_seguranca_iot
FOR UPDATE
TO authenticated
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can delete timers from their organization"
ON public.timers_seguranca_iot
FOR DELETE
TO authenticated
USING (integrado_id = public.get_my_integrado_id());

-- Service role bypass for edge functions
CREATE POLICY "Service role full access"
ON public.timers_seguranca_iot
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_timers_seguranca_iot_updated_at
BEFORE UPDATE ON public.timers_seguranca_iot
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_timers_seguranca_dispositivo ON public.timers_seguranca_iot(dispositivo_id);
CREATE INDEX idx_timers_seguranca_integrado ON public.timers_seguranca_iot(integrado_id);
