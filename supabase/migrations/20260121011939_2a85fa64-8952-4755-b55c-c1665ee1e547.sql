-- Add minimum stock alert columns to produtos_ovos
ALTER TABLE public.produtos_ovos
ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estoque_alerta INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.produtos_ovos.estoque_minimo IS 'Quantidade mínima de estoque para alerta crítico';
COMMENT ON COLUMN public.produtos_ovos.estoque_alerta IS 'Quantidade de estoque para alerta preventivo (amarelo)';