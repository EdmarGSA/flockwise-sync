-- Create table for average mortality reference by week
CREATE TABLE public.mortalidade_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  mortalidade_7_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_14_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_21_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_28_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_35_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_42_dias NUMERIC NOT NULL DEFAULT 0,
  mortalidade_acima_42_dias NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integrado_id)
);

-- Enable RLS
ALTER TABLE public.mortalidade_media ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view mortalidade_media" 
ON public.mortalidade_media 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert mortalidade_media" 
ON public.mortalidade_media 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update mortalidade_media" 
ON public.mortalidade_media 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_mortalidade_media_updated_at
BEFORE UPDATE ON public.mortalidade_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();