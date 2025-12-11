-- Add bird capacity fields to galpoes table
ALTER TABLE public.galpoes 
ADD COLUMN total_aves integer DEFAULT 0,
ADD COLUMN aves_por_m2 numeric(10,2) GENERATED ALWAYS AS (
  CASE 
    WHEN comprimento * largura > 0 THEN total_aves::numeric / (comprimento * largura)
    ELSE 0
  END
) STORED;