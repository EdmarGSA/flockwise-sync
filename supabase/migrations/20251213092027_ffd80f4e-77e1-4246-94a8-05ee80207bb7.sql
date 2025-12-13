-- Create table for supplier-product relationships
CREATE TABLE public.produto_fornecedor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  codigo_produto_fornecedor TEXT,
  preco_compra NUMERIC DEFAULT 0,
  prazo_entrega_dias INTEGER DEFAULT 0,
  quantidade_minima NUMERIC DEFAULT 0,
  fornecedor_principal BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT produto_fornecedor_unique UNIQUE (produto_id, parceiro_id)
);

-- Enable RLS
ALTER TABLE public.produto_fornecedor ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view produto_fornecedor"
  ON public.produto_fornecedor
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert produto_fornecedor"
  ON public.produto_fornecedor
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update produto_fornecedor"
  ON public.produto_fornecedor
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete produto_fornecedor"
  ON public.produto_fornecedor
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_produto_fornecedor_updated_at
  BEFORE UPDATE ON public.produto_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();