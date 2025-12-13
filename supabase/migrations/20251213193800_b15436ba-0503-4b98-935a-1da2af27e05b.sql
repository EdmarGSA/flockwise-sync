-- Adicionar campos de conversão em ordens_compra_itens
ALTER TABLE public.ordens_compra_itens 
ADD COLUMN IF NOT EXISTS unidade_compra text DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS fator_conversao numeric DEFAULT 1;

-- Adicionar campos de conversão em recebimento_itens
ALTER TABLE public.recebimento_itens 
ADD COLUMN IF NOT EXISTS unidade_compra text,
ADD COLUMN IF NOT EXISTS fator_conversao numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantidade_estoque numeric;