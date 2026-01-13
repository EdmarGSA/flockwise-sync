-- Create silos table for storing silo specifications
CREATE TABLE public.silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  galpao_id UUID REFERENCES public.galpoes(id) ON DELETE SET NULL,
  
  -- Identification
  nome TEXT NOT NULL,
  marca TEXT,
  
  -- Technical specifications
  diametro_m NUMERIC(4,2) NOT NULL,
  numero_pernas INTEGER NOT NULL DEFAULT 4,
  numero_aneis INTEGER NOT NULL DEFAULT 3,
  
  -- Capacities
  capacidade_volume_m3 NUMERIC(8,2) NOT NULL,
  fator_tonelada_m3 NUMERIC(5,3) NOT NULL DEFAULT 0.650,
  
  -- Active status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add computed column for capacity in tons
ALTER TABLE public.silos 
ADD COLUMN capacidade_toneladas NUMERIC(8,2) GENERATED ALWAYS AS (capacidade_volume_m3 * fator_tonelada_m3) STORED;

-- Enable RLS
ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using profiles table
CREATE POLICY "Users can view silos from their organization"
ON public.silos
FOR SELECT
USING (
  integrado_id IN (
    SELECT p.integrado_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can create silos for their organization"
ON public.silos
FOR INSERT
WITH CHECK (
  integrado_id IN (
    SELECT p.integrado_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can update silos from their organization"
ON public.silos
FOR UPDATE
USING (
  integrado_id IN (
    SELECT p.integrado_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete silos from their organization"
ON public.silos
FOR DELETE
USING (
  integrado_id IN (
    SELECT p.integrado_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_silos_updated_at
BEFORE UPDATE ON public.silos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_silos_integrado_id ON public.silos(integrado_id);
CREATE INDEX idx_silos_galpao_id ON public.silos(galpao_id);