-- Allow produto_id to be NULL in recebimento_itens
-- This enables inserting items from XML before product linking
ALTER TABLE recebimento_itens 
ALTER COLUMN produto_id DROP NOT NULL;

-- Clean up orphaned recebimentos (those without items)
DELETE FROM recebimentos_mercadoria 
WHERE id NOT IN (
  SELECT DISTINCT recebimento_id FROM recebimento_itens WHERE recebimento_id IS NOT NULL
);