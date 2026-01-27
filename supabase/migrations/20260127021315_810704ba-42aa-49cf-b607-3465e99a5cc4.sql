-- Adicionar coluna tipo_producao na tabela lotes_fornecedor
ALTER TABLE public.lotes_fornecedor
  ADD COLUMN IF NOT EXISTS tipo_producao TEXT DEFAULT 'corte';

-- Comentário explicativo
COMMENT ON COLUMN public.lotes_fornecedor.tipo_producao IS 'Tipo de produção: corte ou postura';