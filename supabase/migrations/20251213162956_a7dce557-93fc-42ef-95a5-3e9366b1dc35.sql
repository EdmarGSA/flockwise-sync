-- Create enum for order status
CREATE TYPE public.ordem_compra_status AS ENUM ('rascunho', 'pendente', 'aprovada', 'parcial_recebida', 'recebida', 'cancelada');

-- Create enum for payment status
CREATE TYPE public.conta_pagar_status AS ENUM ('previsto', 'pendente', 'pago', 'cancelado');

-- Create ordens_compra table (purchase order header)
CREATE TABLE public.ordens_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  numero_oc SERIAL,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_prevista_entrega DATE,
  status ordem_compra_status NOT NULL DEFAULT 'rascunho',
  forma_pagamento TEXT,
  prazo_pagamento_dias INTEGER DEFAULT 30,
  data_vencimento DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_frete NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  observacoes TEXT,
  criado_por UUID,
  aprovado_por UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ordens_compra_itens table (purchase order items)
CREATE TABLE public.ordens_compra_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_compra_id UUID NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'KG',
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  preco_total NUMERIC NOT NULL DEFAULT 0,
  quantidade_recebida NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contas_pagar table (accounts payable)
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  ordem_compra_id UUID REFERENCES public.ordens_compra(id),
  parceiro_id UUID REFERENCES public.parceiros(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status conta_pagar_status NOT NULL DEFAULT 'previsto',
  categoria TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ordens_compra
CREATE POLICY "Users can view ordens_compra" ON public.ordens_compra FOR SELECT USING (true);
CREATE POLICY "Users can insert ordens_compra" ON public.ordens_compra FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update ordens_compra" ON public.ordens_compra FOR UPDATE USING (true);
CREATE POLICY "Users can delete ordens_compra" ON public.ordens_compra FOR DELETE USING (true);

-- RLS Policies for ordens_compra_itens
CREATE POLICY "Users can view ordens_compra_itens" ON public.ordens_compra_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert ordens_compra_itens" ON public.ordens_compra_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update ordens_compra_itens" ON public.ordens_compra_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete ordens_compra_itens" ON public.ordens_compra_itens FOR DELETE USING (true);

-- RLS Policies for contas_pagar
CREATE POLICY "Users can view contas_pagar" ON public.contas_pagar FOR SELECT USING (true);
CREATE POLICY "Users can insert contas_pagar" ON public.contas_pagar FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contas_pagar" ON public.contas_pagar FOR UPDATE USING (true);
CREATE POLICY "Users can delete contas_pagar" ON public.contas_pagar FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ordens_compra_updated_at
  BEFORE UPDATE ON public.ordens_compra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();