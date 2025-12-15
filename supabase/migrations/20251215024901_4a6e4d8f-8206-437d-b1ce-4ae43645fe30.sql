-- Tabela principal de crédito do cliente
CREATE TABLE public.credito_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES parceiros(id),
  limite_credito NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cliente_id)
);

-- Formas e prazos permitidos por cliente
CREATE TABLE public.credito_cliente_formas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credito_cliente_id UUID NOT NULL REFERENCES credito_cliente(id) ON DELETE CASCADE,
  forma_pagamento_id UUID NOT NULL REFERENCES formas_pagamento(id),
  prazo_pagamento_id UUID REFERENCES prazos_pagamento(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credito_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_cliente_formas ENABLE ROW LEVEL SECURITY;

-- RLS policies for credito_cliente
CREATE POLICY "Users can view credito_cliente" ON public.credito_cliente FOR SELECT USING (true);
CREATE POLICY "Users can insert credito_cliente" ON public.credito_cliente FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update credito_cliente" ON public.credito_cliente FOR UPDATE USING (true);
CREATE POLICY "Users can delete credito_cliente" ON public.credito_cliente FOR DELETE USING (true);

-- RLS policies for credito_cliente_formas
CREATE POLICY "Users can view credito_cliente_formas" ON public.credito_cliente_formas FOR SELECT USING (true);
CREATE POLICY "Users can insert credito_cliente_formas" ON public.credito_cliente_formas FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update credito_cliente_formas" ON public.credito_cliente_formas FOR UPDATE USING (true);
CREATE POLICY "Users can delete credito_cliente_formas" ON public.credito_cliente_formas FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_credito_cliente_updated_at
  BEFORE UPDATE ON public.credito_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();