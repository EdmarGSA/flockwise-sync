-- Add separate elimination fields for locomotor and classificacao reasons
ALTER TABLE public.recebimento_lotes
ADD COLUMN quantidade_eliminados_locomotor integer NOT NULL DEFAULT 0,
ADD COLUMN quantidade_eliminados_classificacao integer NOT NULL DEFAULT 0;

-- Update existing records to migrate data from old field
UPDATE public.recebimento_lotes
SET quantidade_eliminados_locomotor = CASE WHEN motivo_eliminacao = 'locomotor' THEN quantidade_eliminados ELSE 0 END,
    quantidade_eliminados_classificacao = CASE WHEN motivo_eliminacao = 'classificacao' THEN quantidade_eliminados ELSE 0 END;