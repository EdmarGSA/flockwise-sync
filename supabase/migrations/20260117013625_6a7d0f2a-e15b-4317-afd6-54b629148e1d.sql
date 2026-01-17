-- Add GTIN columns to recebimento_itens for validation
ALTER TABLE recebimento_itens
ADD COLUMN IF NOT EXISTS gtin_nfe text,
ADD COLUMN IF NOT EXISTS gtin_esperado text;

-- Add comments
COMMENT ON COLUMN recebimento_itens.gtin_nfe IS 'GTIN/EAN recebido na NF-e (cEAN)';
COMMENT ON COLUMN recebimento_itens.gtin_esperado IS 'GTIN/EAN esperado do cadastro de produto ou De-Para';