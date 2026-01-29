-- Tabela de pedidos do catálogo do fornecedor (independente do sistema interno)
CREATE TABLE public.pedidos_catalogo_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  cliente_fornecedor_id UUID NOT NULL REFERENCES clientes_fornecedor(id),
  vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id),
  
  numero_pedido TEXT NOT NULL,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Valores
  valor_bruto NUMERIC DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  
  -- Pagamento e entrega
  condicao_pagamento TEXT,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  
  -- Status: rascunho → pendente → aprovado → separado → faturado → entregue → cancelado
  status TEXT DEFAULT 'rascunho',
  
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens do pedido do catálogo
CREATE TABLE public.pedidos_catalogo_fornecedor_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_catalogo_fornecedor(id) ON DELETE CASCADE,
  produto_catalogo_id UUID NOT NULL REFERENCES produtos_catalogo_fornecedor(id),
  
  quantidade NUMERIC NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  desconto_item NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL,
  
  promocao_id UUID REFERENCES promocoes_fornecedor(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pedidos_catalogo_fornecedor_fornecedor ON pedidos_catalogo_fornecedor(fornecedor_global_id);
CREATE INDEX idx_pedidos_catalogo_fornecedor_cliente ON pedidos_catalogo_fornecedor(cliente_fornecedor_id);
CREATE INDEX idx_pedidos_catalogo_fornecedor_vendedor ON pedidos_catalogo_fornecedor(vendedor_fornecedor_id);
CREATE INDEX idx_pedidos_catalogo_fornecedor_status ON pedidos_catalogo_fornecedor(status);
CREATE INDEX idx_pedidos_catalogo_itens_pedido ON pedidos_catalogo_fornecedor_itens(pedido_id);

-- Habilitar RLS
ALTER TABLE public.pedidos_catalogo_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_catalogo_fornecedor_itens ENABLE ROW LEVEL SECURITY;

-- RLS: Fornecedor acessa seus pedidos
CREATE POLICY "Fornecedor acessa seus pedidos catalogo"
ON public.pedidos_catalogo_fornecedor FOR ALL
USING (
  fornecedor_global_id IN (
    SELECT fornecedor_global_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS: Acesso aos itens via pedido pai
CREATE POLICY "Acesso itens via pedido catalogo"
ON public.pedidos_catalogo_fornecedor_itens FOR ALL
USING (
  pedido_id IN (
    SELECT id FROM pedidos_catalogo_fornecedor 
    WHERE fornecedor_global_id IN (
      SELECT fornecedor_global_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_pedidos_catalogo_fornecedor_updated_at
  BEFORE UPDATE ON public.pedidos_catalogo_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();