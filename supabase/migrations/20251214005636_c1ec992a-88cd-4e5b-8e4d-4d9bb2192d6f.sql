-- Add produto_racao_id column to fases_animal table
ALTER TABLE fases_animal 
ADD COLUMN produto_racao_id UUID REFERENCES produtos(id);

-- Add index for better query performance
CREATE INDEX idx_fases_animal_produto_racao ON fases_animal(produto_racao_id);