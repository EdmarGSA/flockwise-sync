-- Adicionar coluna silo_id na tabela galpoes
ALTER TABLE public.galpoes ADD COLUMN silo_id UUID REFERENCES public.silos(id);

-- Remover coluna galpao_id da tabela silos (o vínculo agora é no galpão)
ALTER TABLE public.silos DROP COLUMN IF EXISTS galpao_id;