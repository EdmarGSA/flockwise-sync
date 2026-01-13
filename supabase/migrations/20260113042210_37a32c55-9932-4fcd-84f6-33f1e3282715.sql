-- Add silo level tracking columns to solicitacoes_racao
ALTER TABLE public.solicitacoes_racao 
ADD COLUMN nivel_funil NUMERIC DEFAULT NULL,
ADD COLUMN nivel_aneis NUMERIC DEFAULT NULL,
ADD COLUMN nivel_estimado_kg NUMERIC DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.solicitacoes_racao.nivel_funil IS 'Nível do funil: 0 (vazio), 0.5 (meio), 1 (cheio)';
COMMENT ON COLUMN public.solicitacoes_racao.nivel_aneis IS 'Quantidade de anéis preenchidos (0 a N em incrementos de 0.5)';
COMMENT ON COLUMN public.solicitacoes_racao.nivel_estimado_kg IS 'Estimativa calculada de ração restante em kg';