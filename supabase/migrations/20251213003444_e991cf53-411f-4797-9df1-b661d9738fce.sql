-- Add packaging conversion columns to produtos table
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade_compra text DEFAULT 'UN';
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS embalagem_quantidade numeric DEFAULT 1;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fator_conversao numeric DEFAULT 1;