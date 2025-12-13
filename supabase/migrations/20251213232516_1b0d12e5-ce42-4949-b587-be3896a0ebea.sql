-- Add cost fields to ordens_producao
ALTER TABLE public.ordens_producao
ADD COLUMN custo_total_estimado NUMERIC DEFAULT 0,
ADD COLUMN custo_total_real NUMERIC DEFAULT 0,
ADD COLUMN custo_por_kg NUMERIC DEFAULT 0;

-- Add cost field to ordens_producao_itens
ALTER TABLE public.ordens_producao_itens
ADD COLUMN custo_unitario NUMERIC DEFAULT 0,
ADD COLUMN custo_total NUMERIC DEFAULT 0;