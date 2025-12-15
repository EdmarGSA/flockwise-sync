-- Create produtos_animais table for sellable animals (live birds, eggs, pigs)
CREATE TABLE public.produtos_animais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  grupo_animal_id UUID REFERENCES public.grupos_animal(id),
  sku TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_venda TEXT NOT NULL DEFAULT 'KG',
  preco_venda_base NUMERIC DEFAULT 0,
  peso_medio_referencia NUMERIC,
  ncm TEXT,
  cest TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos_animais ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view produtos_animais" 
  ON public.produtos_animais 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert produtos_animais" 
  ON public.produtos_animais 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update produtos_animais" 
  ON public.produtos_animais 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete produtos_animais" 
  ON public.produtos_animais 
  FOR DELETE 
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_produtos_animais_updated_at
  BEFORE UPDATE ON public.produtos_animais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add produto_animal_id to pedido_itens for animal product sales
ALTER TABLE public.pedido_itens 
  ADD COLUMN produto_animal_id UUID REFERENCES public.produtos_animais(id);

-- Add peso_total_kg for animal sales (weight-based)
ALTER TABLE public.pedido_itens 
  ADD COLUMN peso_total_kg NUMERIC;