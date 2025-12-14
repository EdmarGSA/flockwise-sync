-- Create nutricoes table (named formulas for products)
CREATE TABLE public.nutricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  padrao BOOLEAN NOT NULL DEFAULT false,
  integrado_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nutricao_itens table (ingredients for each nutrition)
CREATE TABLE public.nutricao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nutricao_id UUID NOT NULL REFERENCES public.nutricoes(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'KG',
  integrado_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add nutricao_id to ordens_producao to track which nutrition was used
ALTER TABLE public.ordens_producao ADD COLUMN nutricao_id UUID REFERENCES public.nutricoes(id);

-- Create indexes for performance
CREATE INDEX idx_nutricoes_produto_id ON public.nutricoes(produto_id);
CREATE INDEX idx_nutricoes_integrado_id ON public.nutricoes(integrado_id);
CREATE INDEX idx_nutricao_itens_nutricao_id ON public.nutricao_itens(nutricao_id);
CREATE INDEX idx_nutricao_itens_integrado_id ON public.nutricao_itens(integrado_id);
CREATE INDEX idx_ordens_producao_nutricao_id ON public.ordens_producao(nutricao_id);

-- Enable RLS
ALTER TABLE public.nutricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutricao_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for nutricoes
CREATE POLICY "Users can view nutricoes" ON public.nutricoes FOR SELECT USING (true);
CREATE POLICY "Users can insert nutricoes" ON public.nutricoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update nutricoes" ON public.nutricoes FOR UPDATE USING (true);
CREATE POLICY "Users can delete nutricoes" ON public.nutricoes FOR DELETE USING (true);

-- RLS policies for nutricao_itens
CREATE POLICY "Users can view nutricao_itens" ON public.nutricao_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert nutricao_itens" ON public.nutricao_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update nutricao_itens" ON public.nutricao_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete nutricao_itens" ON public.nutricao_itens FOR DELETE USING (true);

-- Migrate existing produto_formulacao data to new structure
-- For each product with existing formula, create a default nutrition named "Padrão"
INSERT INTO public.nutricoes (produto_id, nome, descricao, ativo, padrao, integrado_id)
SELECT DISTINCT 
  pf.produto_id, 
  'Padrão' as nome,
  'Fórmula migrada automaticamente' as descricao,
  true as ativo,
  true as padrao,
  pf.integrado_id
FROM public.produto_formulacao pf;

-- Migrate formula items to nutricao_itens
INSERT INTO public.nutricao_itens (nutricao_id, insumo_id, quantidade, unidade_medida, integrado_id)
SELECT 
  n.id as nutricao_id,
  pf.insumo_id,
  pf.quantidade,
  pf.unidade_medida,
  pf.integrado_id
FROM public.produto_formulacao pf
JOIN public.nutricoes n ON n.produto_id = pf.produto_id AND n.integrado_id = pf.integrado_id;

-- Create trigger to update updated_at
CREATE TRIGGER update_nutricoes_updated_at
BEFORE UPDATE ON public.nutricoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();