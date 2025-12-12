-- Create grupos_produto table (Ração, Suplemento, Cereais, Medicamento, etc.)
CREATE TABLE public.grupos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grupos_produto ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grupos_produto
CREATE POLICY "Users can view grupos_produto" ON public.grupos_produto FOR SELECT USING (true);
CREATE POLICY "Users can insert grupos_produto" ON public.grupos_produto FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update grupos_produto" ON public.grupos_produto FOR UPDATE USING (true);

-- Add tipo_origem to categorias
ALTER TABLE public.categorias ADD COLUMN tipo_origem TEXT DEFAULT 'terceiros';

-- Add new columns to produtos
ALTER TABLE public.produtos ADD COLUMN grupo_produto_id UUID REFERENCES public.grupos_produto(id);
ALTER TABLE public.produtos ADD COLUMN grupo_animal_id UUID REFERENCES public.grupos_animal(id);
ALTER TABLE public.produtos ADD COLUMN fase_animal_id UUID REFERENCES public.fases_animal(id);

-- Create produto_formulacao table (BOM - Bill of Materials)
CREATE TABLE public.produto_formulacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'KG',
  integrado_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produto_formulacao ENABLE ROW LEVEL SECURITY;

-- RLS Policies for produto_formulacao
CREATE POLICY "Users can view produto_formulacao" ON public.produto_formulacao FOR SELECT USING (true);
CREATE POLICY "Users can insert produto_formulacao" ON public.produto_formulacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update produto_formulacao" ON public.produto_formulacao FOR UPDATE USING (true);
CREATE POLICY "Users can delete produto_formulacao" ON public.produto_formulacao FOR DELETE USING (true);

-- Trigger for updated_at on grupos_produto
CREATE TRIGGER update_grupos_produto_updated_at
  BEFORE UPDATE ON public.grupos_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();