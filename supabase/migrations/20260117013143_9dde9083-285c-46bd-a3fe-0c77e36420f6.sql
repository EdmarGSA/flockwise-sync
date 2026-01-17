-- Add new columns to produto_fornecedor for robust De-Para system
ALTER TABLE produto_fornecedor
ADD COLUMN IF NOT EXISTS unidade_compra_fornecedor text,
ADD COLUMN IF NOT EXISTS fator_conversao_fornecedor numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS gtin_esperado text,
ADD COLUMN IF NOT EXISTS descricao_produto_fornecedor text;

-- Add comment to explain the columns
COMMENT ON COLUMN produto_fornecedor.unidade_compra_fornecedor IS 'Unidade usada pelo fornecedor na NF-e (CX, SC, UN, etc.)';
COMMENT ON COLUMN produto_fornecedor.fator_conversao_fornecedor IS 'Multiplicador para converter unidade do fornecedor para unidade de estoque';
COMMENT ON COLUMN produto_fornecedor.gtin_esperado IS 'Código de barras EAN/GTIN esperado do fornecedor para validação';
COMMENT ON COLUMN produto_fornecedor.descricao_produto_fornecedor IS 'Nome/descrição do produto conforme aparece na NF-e do fornecedor';