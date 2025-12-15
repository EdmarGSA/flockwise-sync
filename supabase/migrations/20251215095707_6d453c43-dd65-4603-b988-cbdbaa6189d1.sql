-- Add custo_aves column to lotes table for tracking bird acquisition cost
ALTER TABLE public.lotes ADD COLUMN custo_aves numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.lotes.custo_aves IS 'Custo total de aquisição das aves em R$';