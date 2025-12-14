-- Add new roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'comprador';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'conferente';

-- Add refaturamento status to ordem_compra_status enum
ALTER TYPE ordem_compra_status ADD VALUE IF NOT EXISTS 'refaturamento';

-- Add divergente_preco status to recebimento_status enum
ALTER TYPE recebimento_status ADD VALUE IF NOT EXISTS 'divergente_preco';

-- Add requer_quarentena column to produtos table
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS requer_quarentena BOOLEAN DEFAULT true;

-- Add liberado_por and data_liberacao columns to recebimentos_mercadoria table
ALTER TABLE public.recebimentos_mercadoria 
  ADD COLUMN IF NOT EXISTS liberado_por UUID,
  ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMPTZ;