-- Drop the computed column and recreate with inverted logic
ALTER TABLE public.galpoes DROP COLUMN aves_por_m2;
ALTER TABLE public.galpoes DROP COLUMN total_aves;

-- Add aves_por_m2 as input field and total_aves as computed
ALTER TABLE public.galpoes 
ADD COLUMN aves_por_m2 numeric(10,2) DEFAULT 0,
ADD COLUMN total_aves integer GENERATED ALWAYS AS (
  ROUND(aves_por_m2 * comprimento * largura)::integer
) STORED;