
-- Create enum for mortality reason
CREATE TYPE public.motivo_mortalidade AS ENUM ('natural', 'eliminado');

-- Create enum for elimination sub-reason
CREATE TYPE public.submotivo_eliminacao AS ENUM ('problema_locomotor', 'debilitado', 'deficiente');

-- Create mortality tracking table
CREATE TABLE public.mortalidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mortality items table for detailed tracking
CREATE TABLE public.mortalidade_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mortalidade_id UUID NOT NULL REFERENCES public.mortalidade(id) ON DELETE CASCADE,
  motivo motivo_mortalidade NOT NULL,
  submotivo submotivo_eliminacao NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  peso_kg NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mortalidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortalidade_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for mortalidade
CREATE POLICY "Users can view mortalidade" ON public.mortalidade FOR SELECT USING (true);
CREATE POLICY "Users can insert mortalidade" ON public.mortalidade FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update mortalidade" ON public.mortalidade FOR UPDATE USING (true);
CREATE POLICY "Users can delete mortalidade" ON public.mortalidade FOR DELETE USING (true);

-- RLS policies for mortalidade_itens
CREATE POLICY "Users can view mortalidade_itens" ON public.mortalidade_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert mortalidade_itens" ON public.mortalidade_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update mortalidade_itens" ON public.mortalidade_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete mortalidade_itens" ON public.mortalidade_itens FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_mortalidade_updated_at
  BEFORE UPDATE ON public.mortalidade
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
