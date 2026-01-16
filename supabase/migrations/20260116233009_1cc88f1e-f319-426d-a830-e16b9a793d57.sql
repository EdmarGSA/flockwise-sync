-- Adicionar colunas para armazenar dados de consumo real na pesagem
ALTER TABLE pesagens ADD COLUMN IF NOT EXISTS nivel_silo_kg NUMERIC;
ALTER TABLE pesagens ADD COLUMN IF NOT EXISTS total_recebido_kg NUMERIC;
ALTER TABLE pesagens ADD COLUMN IF NOT EXISTS consumo_real_kg NUMERIC;
ALTER TABLE pesagens ADD COLUMN IF NOT EXISTS conversao_alimentar NUMERIC;

-- Comentários para documentação
COMMENT ON COLUMN pesagens.nivel_silo_kg IS 'Nível do silo em kg no momento da pesagem';
COMMENT ON COLUMN pesagens.total_recebido_kg IS 'Total de ração recebida até a data da pesagem';
COMMENT ON COLUMN pesagens.consumo_real_kg IS 'Consumo real calculado: total_recebido - nivel_silo';
COMMENT ON COLUMN pesagens.conversao_alimentar IS 'CA calculada: consumo_real / (aves_vivas * peso_medio)';