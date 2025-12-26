-- Add column for shipping observations
ALTER TABLE public.solicitacoes_racao 
ADD COLUMN IF NOT EXISTS observacoes_envio TEXT;