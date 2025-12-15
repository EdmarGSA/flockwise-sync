
-- Create ENUMs for order status and accounts receivable status
CREATE TYPE status_pedido AS ENUM (
  'rascunho',
  'pendente_aprovacao', 
  'aprovado',
  'em_separacao',
  'faturado',
  'cancelado'
);

CREATE TYPE conta_receber_status AS ENUM (
  'previsao',
  'pendente',
  'recebido',
  'parcial',
  'cancelado'
);

-- Create price tables for commercial policies
CREATE TABLE public.tabelas_preco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  margem_minima_percentual NUMERIC NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price table items (prices per product)
CREATE TABLE public.tabelas_preco_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_preco_id UUID NOT NULL REFERENCES public.tabelas_preco(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  desconto_maximo_percentual NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tabela_preco_id, produto_id)
);

-- Create sales orders table
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido SERIAL,
  integrado_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.parceiros(id),
  tabela_preco_id UUID REFERENCES public.tabelas_preco(id),
  vendedor_id UUID REFERENCES public.profiles(id),
  status status_pedido NOT NULL DEFAULT 'rascunho',
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  forma_pagamento forma_pagamento,
  prazo_pagamento_dias INTEGER DEFAULT 30,
  valor_subtotal NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  valor_frete NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  aprovado_por UUID REFERENCES public.profiles(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  faturado_por UUID REFERENCES public.profiles(id),
  data_faturamento TIMESTAMP WITH TIME ZONE,
  numero_nfe TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'KG',
  preco_tabela NUMERIC,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  lote_producao_id UUID,
  margem_calculada NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts receivable table
CREATE TABLE public.contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  pedido_id UUID REFERENCES public.pedidos(id),
  cliente_id UUID REFERENCES public.parceiros(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status conta_receber_status NOT NULL DEFAULT 'previsao',
  forma_pagamento forma_pagamento,
  conta_bancaria_id UUID REFERENCES public.contas_bancarias(id),
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centro_custos(id),
  numero_documento TEXT,
  juros NUMERIC DEFAULT 0,
  multa NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  valor_recebido NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order separation/expedition table
CREATE TABLE public.separacao_pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  pedido_item_id UUID NOT NULL REFERENCES public.pedido_itens(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade_separada NUMERIC NOT NULL,
  lote_producao_id UUID,
  separado_por UUID REFERENCES public.profiles(id),
  data_separacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tabelas_preco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabelas_preco_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separacao_pedidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tabelas_preco
CREATE POLICY "Users can view tabelas_preco" ON public.tabelas_preco FOR SELECT USING (true);
CREATE POLICY "Users can insert tabelas_preco" ON public.tabelas_preco FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tabelas_preco" ON public.tabelas_preco FOR UPDATE USING (true);
CREATE POLICY "Users can delete tabelas_preco" ON public.tabelas_preco FOR DELETE USING (true);

-- RLS Policies for tabelas_preco_itens
CREATE POLICY "Users can view tabelas_preco_itens" ON public.tabelas_preco_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert tabelas_preco_itens" ON public.tabelas_preco_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tabelas_preco_itens" ON public.tabelas_preco_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete tabelas_preco_itens" ON public.tabelas_preco_itens FOR DELETE USING (true);

-- RLS Policies for pedidos
CREATE POLICY "Users can view pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Users can insert pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update pedidos" ON public.pedidos FOR UPDATE USING (true);
CREATE POLICY "Users can delete pedidos" ON public.pedidos FOR DELETE USING (true);

-- RLS Policies for pedido_itens
CREATE POLICY "Users can view pedido_itens" ON public.pedido_itens FOR SELECT USING (true);
CREATE POLICY "Users can insert pedido_itens" ON public.pedido_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update pedido_itens" ON public.pedido_itens FOR UPDATE USING (true);
CREATE POLICY "Users can delete pedido_itens" ON public.pedido_itens FOR DELETE USING (true);

-- RLS Policies for contas_receber
CREATE POLICY "Users can view contas_receber" ON public.contas_receber FOR SELECT USING (true);
CREATE POLICY "Users can insert contas_receber" ON public.contas_receber FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contas_receber" ON public.contas_receber FOR UPDATE USING (true);
CREATE POLICY "Users can delete contas_receber" ON public.contas_receber FOR DELETE USING (true);

-- RLS Policies for separacao_pedidos
CREATE POLICY "Users can view separacao_pedidos" ON public.separacao_pedidos FOR SELECT USING (true);
CREATE POLICY "Users can insert separacao_pedidos" ON public.separacao_pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update separacao_pedidos" ON public.separacao_pedidos FOR UPDATE USING (true);
CREATE POLICY "Users can delete separacao_pedidos" ON public.separacao_pedidos FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_tabelas_preco_updated_at BEFORE UPDATE ON public.tabelas_preco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contas_receber_updated_at BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
