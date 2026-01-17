-- Add urgente column to solicitacoes_racao table
ALTER TABLE public.solicitacoes_racao ADD COLUMN IF NOT EXISTS urgente boolean DEFAULT false;