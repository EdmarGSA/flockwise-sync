-- Add freight type column to ordens_compra
ALTER TABLE public.ordens_compra 
ADD COLUMN IF NOT EXISTS tipo_frete text DEFAULT 'cif';