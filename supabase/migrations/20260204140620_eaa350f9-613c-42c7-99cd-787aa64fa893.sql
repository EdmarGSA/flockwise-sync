-- Adicionar coluna para vincular cliente ao vendedor responsável
ALTER TABLE clientes_fornecedor
ADD COLUMN vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id) ON DELETE SET NULL;

-- Índice para performance de queries filtradas por vendedor
CREATE INDEX idx_clientes_fornecedor_vendedor 
ON clientes_fornecedor(vendedor_fornecedor_id);

-- Comentário para documentação
COMMENT ON COLUMN clientes_fornecedor.vendedor_fornecedor_id IS 'Vendedor responsável pela carteira deste cliente. NULL = visível para todos os vendedores.';