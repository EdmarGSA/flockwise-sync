-- Tabela para armazenar pesagens de aves
CREATE TABLE public.pesagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id),
  integrado_id UUID NOT NULL,
  data_pesagem DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para itens individuais de cada pesagem
CREATE TABLE public.pesagem_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesagem_id UUID NOT NULL REFERENCES public.pesagens(id) ON DELETE CASCADE,
  quantidade_aves INTEGER NOT NULL,
  peso_bruto_g NUMERIC NOT NULL,
  peso_tara_g NUMERIC NOT NULL DEFAULT 0,
  peso_liquido_g NUMERIC GENERATED ALWAYS AS (peso_bruto_g - peso_tara_g) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pesagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesagem_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for pesagens
CREATE POLICY "Users can view pesagens" ON public.pesagens FOR SELECT USING (true);
CREATE POLICY "Users can insert pesagens" ON public.pesagens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update pesagens" ON public.pesagens FOR UPDATE USING (true);
CREATE POLICY "Users can delete pesagens" ON public.pesagens FOR DELETE USING (true);

-- RLS policies for pesagem_itens
CREATE POLICY "Users can view pesagem_itens" ON public.pesagem_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert pesagem_itens" ON public.pesagem_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update pesagem_itens" ON public.pesagem_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete pesagem_itens" ON public.pesagem_itens FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pesagens_updated_at
  BEFORE UPDATE ON public.pesagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();