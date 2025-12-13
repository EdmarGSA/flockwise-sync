
-- Create enum for quarantine status
CREATE TYPE public.status_quarentena AS ENUM ('quarentena', 'liberado', 'rejeitado');

-- Create enum for receiving status
CREATE TYPE public.recebimento_status AS ENUM ('em_conferencia', 'divergente', 'aguardando_autorizacao', 'finalizado', 'cancelado');

-- Create enum for divergence type
CREATE TYPE public.divergencia_tipo AS ENUM ('quantidade', 'preco', 'condicao_pagamento', 'produto_nao_previsto');

-- Create enum for divergence status
CREATE TYPE public.divergencia_status AS ENUM ('aberta', 'em_negociacao', 'resolvida', 'aceita_com_autorizacao');

-- Create table for receiving header
CREATE TABLE public.recebimentos_mercadoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  ordem_compra_id UUID REFERENCES public.ordens_compra(id),
  numero_nfe TEXT,
  chave_nfe TEXT,
  serie_nfe TEXT,
  data_emissao_nfe DATE,
  data_recebimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recebido_por UUID,
  valor_nfe NUMERIC DEFAULT 0,
  valor_frete_nfe NUMERIC DEFAULT 0,
  valor_desconto_nfe NUMERIC DEFAULT 0,
  condicao_pagamento_nfe TEXT,
  cnpj_fornecedor TEXT,
  razao_social_fornecedor TEXT,
  status public.recebimento_status NOT NULL DEFAULT 'em_conferencia',
  observacoes TEXT,
  autorizado_por UUID,
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  justificativa_autorizacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for receiving items
CREATE TABLE public.recebimento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id UUID NOT NULL REFERENCES public.recebimentos_mercadoria(id) ON DELETE CASCADE,
  ordem_compra_item_id UUID REFERENCES public.ordens_compra_itens(id),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade_oc NUMERIC DEFAULT 0,
  quantidade_nfe NUMERIC DEFAULT 0,
  quantidade_fisica NUMERIC DEFAULT 0,
  preco_oc NUMERIC DEFAULT 0,
  preco_nfe NUMERIC DEFAULT 0,
  lote_fornecedor TEXT,
  data_validade DATE,
  codigo_produto_nfe TEXT,
  descricao_produto_nfe TEXT,
  unidade_nfe TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for divergences
CREATE TABLE public.divergencias_recebimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id UUID NOT NULL REFERENCES public.recebimentos_mercadoria(id) ON DELETE CASCADE,
  recebimento_item_id UUID REFERENCES public.recebimento_itens(id) ON DELETE CASCADE,
  tipo public.divergencia_tipo NOT NULL,
  descricao TEXT NOT NULL,
  valor_oc NUMERIC,
  valor_nfe NUMERIC,
  valor_fisico NUMERIC,
  percentual_diferenca NUMERIC,
  status public.divergencia_status NOT NULL DEFAULT 'aberta',
  resolucao TEXT,
  aceita BOOLEAN DEFAULT false,
  criado_por UUID,
  resolvido_por UUID,
  data_resolucao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to kardex table
ALTER TABLE public.kardex 
ADD COLUMN IF NOT EXISTS lote_fornecedor TEXT,
ADD COLUMN IF NOT EXISTS status_quarentena public.status_quarentena,
ADD COLUMN IF NOT EXISTS recebimento_id UUID REFERENCES public.recebimentos_mercadoria(id);

-- Enable RLS on new tables
ALTER TABLE public.recebimentos_mercadoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divergencias_recebimento ENABLE ROW LEVEL SECURITY;

-- RLS policies for recebimentos_mercadoria
CREATE POLICY "Users can view recebimentos_mercadoria" 
ON public.recebimentos_mercadoria FOR SELECT USING (true);

CREATE POLICY "Users can insert recebimentos_mercadoria" 
ON public.recebimentos_mercadoria FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update recebimentos_mercadoria" 
ON public.recebimentos_mercadoria FOR UPDATE USING (true);

CREATE POLICY "Users can delete recebimentos_mercadoria" 
ON public.recebimentos_mercadoria FOR DELETE USING (true);

-- RLS policies for recebimento_itens
CREATE POLICY "Users can view recebimento_itens" 
ON public.recebimento_itens FOR SELECT USING (true);

CREATE POLICY "Users can insert recebimento_itens" 
ON public.recebimento_itens FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update recebimento_itens" 
ON public.recebimento_itens FOR UPDATE USING (true);

CREATE POLICY "Users can delete recebimento_itens" 
ON public.recebimento_itens FOR DELETE USING (true);

-- RLS policies for divergencias_recebimento
CREATE POLICY "Users can view divergencias_recebimento" 
ON public.divergencias_recebimento FOR SELECT USING (true);

CREATE POLICY "Users can insert divergencias_recebimento" 
ON public.divergencias_recebimento FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update divergencias_recebimento" 
ON public.divergencias_recebimento FOR UPDATE USING (true);

CREATE POLICY "Users can delete divergencias_recebimento" 
ON public.divergencias_recebimento FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_recebimentos_mercadoria_updated_at
BEFORE UPDATE ON public.recebimentos_mercadoria
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_divergencias_recebimento_updated_at
BEFORE UPDATE ON public.divergencias_recebimento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
