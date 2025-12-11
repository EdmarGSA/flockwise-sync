-- Create categorias table
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  integrado_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create produtos table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias(id),
  marca TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  codigo_barras_ean TEXT,
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  localizacao_estoque TEXT,
  custo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  custo_medio NUMERIC(12,4) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,4) NOT NULL DEFAULT 0,
  ncm TEXT,
  cest TEXT,
  origem_mercadoria TEXT DEFAULT '0',
  embalagem_tipo TEXT,
  embalagem_primaria TEXT,
  embalagem_secundaria TEXT,
  integrado_id UUID NOT NULL,
  criado_por UUID REFERENCES auth.users(id),
  atualizado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create kardex table for inventory movements
CREATE TABLE public.kardex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo_movimento TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste'
  quantidade NUMERIC(12,3) NOT NULL,
  custo_unitario NUMERIC(12,4),
  saldo_anterior NUMERIC(12,3) NOT NULL,
  saldo_atual NUMERIC(12,3) NOT NULL,
  documento_ref TEXT,
  observacao TEXT,
  integrado_id UUID NOT NULL,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organizacoes table
CREATE TABLE public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  inscricao_estadual TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  integrado_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kardex ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for categorias
CREATE POLICY "Users can view categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Users can insert categorias" ON public.categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update categorias" ON public.categorias FOR UPDATE USING (true);

-- RLS policies for produtos
CREATE POLICY "Users can view produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Users can insert produtos" ON public.produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update produtos" ON public.produtos FOR UPDATE USING (true);

-- RLS policies for kardex
CREATE POLICY "Users can view kardex" ON public.kardex FOR SELECT USING (true);
CREATE POLICY "Users can insert kardex" ON public.kardex FOR INSERT WITH CHECK (true);

-- RLS policies for organizacoes
CREATE POLICY "Users can view organizacoes" ON public.organizacoes FOR SELECT USING (true);
CREATE POLICY "Users can insert organizacoes" ON public.organizacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update organizacoes" ON public.organizacoes FOR UPDATE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organizacoes_updated_at BEFORE UPDATE ON public.organizacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();