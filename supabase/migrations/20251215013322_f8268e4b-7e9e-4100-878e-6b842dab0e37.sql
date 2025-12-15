-- Create config_fechamento table for adjustment constant configuration
CREATE TABLE public.config_fechamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL UNIQUE,
  constante_ajuste_ca NUMERIC NOT NULL DEFAULT 3.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_fechamento ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own config_fechamento"
ON public.config_fechamento FOR SELECT
USING (auth.uid() = integrado_id);

CREATE POLICY "Users can insert their own config_fechamento"
ON public.config_fechamento FOR INSERT
WITH CHECK (auth.uid() = integrado_id);

CREATE POLICY "Users can update their own config_fechamento"
ON public.config_fechamento FOR UPDATE
USING (auth.uid() = integrado_id);

-- Create fechamento_lotes table for batch closing data
CREATE TABLE public.fechamento_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL UNIQUE REFERENCES public.lotes(id),
  integrado_id UUID NOT NULL,
  
  -- Housing data (calculated automatically)
  aves_alojadas INTEGER NOT NULL,
  peso_inicial_kg NUMERIC NOT NULL,
  data_alojamento DATE NOT NULL,
  
  -- Slaughter data (user input)
  data_abate DATE NOT NULL,
  aves_abatidas INTEGER NOT NULL,
  peso_total_abatido_kg NUMERIC NOT NULL,
  consumo_total_racao_kg NUMERIC NOT NULL,
  
  -- Condemnations (free input fields)
  aves_condenadas_parcial INTEGER DEFAULT 0,
  aves_condenadas_total INTEGER DEFAULT 0,
  calo_pata_quantidade INTEGER DEFAULT 0,
  
  -- Calculated metrics
  idade_abate INTEGER NOT NULL,
  peso_medio_real_kg NUMERIC NOT NULL,
  gpd_kg NUMERIC NOT NULL,
  conversao_alimentar NUMERIC NOT NULL,
  peso_projetado_kg NUMERIC,
  conversao_ajustada NUMERIC,
  viabilidade_percentual NUMERIC NOT NULL,
  mortalidade_percentual NUMERIC NOT NULL,
  iep NUMERIC NOT NULL,
  iee NUMERIC,
  
  -- Reference for comparison
  conv_ajustada_prev NUMERIC,
  
  -- Audit
  fechado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fechamento_lotes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view fechamento_lotes"
ON public.fechamento_lotes FOR SELECT
USING (true);

CREATE POLICY "Users can insert fechamento_lotes"
ON public.fechamento_lotes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update fechamento_lotes"
ON public.fechamento_lotes FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_config_fechamento_updated_at
BEFORE UPDATE ON public.config_fechamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fechamento_lotes_updated_at
BEFORE UPDATE ON public.fechamento_lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();