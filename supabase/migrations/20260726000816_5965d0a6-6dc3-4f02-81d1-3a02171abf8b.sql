ALTER TABLE public.fechamento_lotes
  ADD COLUMN IF NOT EXISTS ripi_arquivo_path text,
  ADD COLUMN IF NOT EXISTS ripi_importado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ripi_importado_por uuid,
  ADD COLUMN IF NOT EXISTS ripi_dados_brutos jsonb;