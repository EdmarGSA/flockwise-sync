-- Add tracking columns to observacoes_lote for read status
ALTER TABLE public.observacoes_lote 
ADD COLUMN lido_por uuid REFERENCES auth.users(id),
ADD COLUMN lido_em timestamp with time zone;

-- Add confirmation columns to tratamentos_lote for application confirmation
ALTER TABLE public.tratamentos_lote 
ADD COLUMN aplicacao_confirmada boolean DEFAULT false,
ADD COLUMN aplicacao_confirmada_por uuid REFERENCES auth.users(id),
ADD COLUMN aplicacao_confirmada_em timestamp with time zone;