-- Create sequence for numero_op first
CREATE SEQUENCE IF NOT EXISTS ordens_producao_numero_op_seq START 1;

-- Create production orders table
CREATE TABLE public.ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  numero_op INTEGER NOT NULL DEFAULT nextval('ordens_producao_numero_op_seq'::regclass),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade_planejada NUMERIC NOT NULL,
  quantidade_produzida NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho',
  data_prevista_producao DATE,
  data_inicio_producao TIMESTAMP WITH TIME ZONE,
  data_finalizacao TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  criado_por UUID,
  aprovado_por UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create production order items table (BOM explosion)
CREATE TABLE public.ordens_producao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_producao_id UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES produtos(id),
  quantidade_necessaria NUMERIC NOT NULL,
  quantidade_utilizada NUMERIC DEFAULT 0,
  unidade_medida TEXT NOT NULL DEFAULT 'KG',
  estoque_disponivel NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_producao_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for ordens_producao
CREATE POLICY "Users can view ordens_producao" ON public.ordens_producao
  FOR SELECT USING (true);

CREATE POLICY "Users can insert ordens_producao" ON public.ordens_producao
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update ordens_producao" ON public.ordens_producao
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete ordens_producao" ON public.ordens_producao
  FOR DELETE USING (true);

-- RLS policies for ordens_producao_itens
CREATE POLICY "Users can view ordens_producao_itens" ON public.ordens_producao_itens
  FOR SELECT USING (true);

CREATE POLICY "Users can insert ordens_producao_itens" ON public.ordens_producao_itens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update ordens_producao_itens" ON public.ordens_producao_itens
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete ordens_producao_itens" ON public.ordens_producao_itens
  FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ordens_producao_updated_at
  BEFORE UPDATE ON public.ordens_producao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();