-- Create config_silo table for dynamic silo level thresholds
CREATE TABLE public.config_silo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dias_critico INTEGER NOT NULL DEFAULT 2,
  dias_atencao INTEGER NOT NULL DEFAULT 4,
  dias_ok INTEGER NOT NULL DEFAULT 5,
  dias_estoque_sugerido INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integrado_id)
);

-- Enable RLS
ALTER TABLE public.config_silo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own config_silo"
ON public.config_silo
FOR SELECT
USING (auth.uid() = integrado_id);

CREATE POLICY "Users can insert their own config_silo"
ON public.config_silo
FOR INSERT
WITH CHECK (auth.uid() = integrado_id);

CREATE POLICY "Users can update their own config_silo"
ON public.config_silo
FOR UPDATE
USING (auth.uid() = integrado_id);

-- Trigger for updated_at
CREATE TRIGGER update_config_silo_updated_at
BEFORE UPDATE ON public.config_silo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();