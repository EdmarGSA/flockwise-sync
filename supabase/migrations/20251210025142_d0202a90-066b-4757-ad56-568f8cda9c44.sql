-- Create enum for bird sex type
CREATE TYPE sexo_ave AS ENUM ('macho', 'femea', 'misto');

-- Create table for bird performance reference data
CREATE TABLE public.desempenho_aves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  linhagem linhagem_aves NOT NULL,
  sexo sexo_ave NOT NULL,
  dia INTEGER NOT NULL,
  peso_g NUMERIC NOT NULL,
  ganho_diario_g NUMERIC NOT NULL,
  ganho_medio_diario_g NUMERIC NOT NULL,
  conversao_alimentar_acumulada NUMERIC NOT NULL,
  consumo_diario_racao_g NUMERIC NOT NULL,
  consumo_acumulado_racao_g NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(linhagem, sexo, dia)
);

-- Enable Row Level Security
ALTER TABLE public.desempenho_aves ENABLE ROW LEVEL SECURITY;

-- Create policies for read access (reference data is public for authenticated users)
CREATE POLICY "Authenticated users can view desempenho_aves" 
ON public.desempenho_aves 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update performance data
CREATE POLICY "Admins can insert desempenho_aves" 
ON public.desempenho_aves 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update desempenho_aves" 
ON public.desempenho_aves 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_desempenho_aves_updated_at
BEFORE UPDATE ON public.desempenho_aves
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.desempenho_aves IS 'Tabela de referência de desempenho de aves por linhagem e sexo';