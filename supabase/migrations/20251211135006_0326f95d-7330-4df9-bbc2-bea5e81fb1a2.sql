-- Add new status 'saiu_para_entrega' to lote_status enum
ALTER TYPE public.lote_status ADD VALUE 'saiu_para_entrega' AFTER 'previsao';

-- Create table for lote reception data
CREATE TABLE public.recebimento_lotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  quantidade_mortos INTEGER NOT NULL DEFAULT 0,
  quantidade_caixas_conferidas INTEGER NOT NULL DEFAULT 0,
  quantidade_pintinhos_caixa INTEGER NOT NULL DEFAULT 0,
  aspecto_pintinhos TEXT NOT NULL CHECK (aspecto_pintinhos IN ('bom', 'ruim', 'regular')),
  quantidade_eliminados INTEGER NOT NULL DEFAULT 0,
  motivo_eliminacao TEXT CHECK (motivo_eliminacao IN ('locomotor', 'classificacao', NULL)),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recebimento_lotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view recebimento_lotes" ON public.recebimento_lotes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert recebimento_lotes" ON public.recebimento_lotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update recebimento_lotes" ON public.recebimento_lotes
  FOR UPDATE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_recebimento_lotes_updated_at
  BEFORE UPDATE ON public.recebimento_lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();