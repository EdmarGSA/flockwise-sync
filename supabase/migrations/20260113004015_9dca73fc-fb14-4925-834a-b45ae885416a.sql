-- Remover a constraint antiga que limita a 1 registro por integrado_id
ALTER TABLE public.mortalidade_media 
DROP CONSTRAINT IF EXISTS mortalidade_media_integrado_id_key;