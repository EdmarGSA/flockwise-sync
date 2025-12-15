-- Allow NULL values for linhagem column to support laying hen batches
-- Broiler batches use 'linhagem', laying hen batches use 'linhagem_postura'
ALTER TABLE lotes ALTER COLUMN linhagem DROP NOT NULL;