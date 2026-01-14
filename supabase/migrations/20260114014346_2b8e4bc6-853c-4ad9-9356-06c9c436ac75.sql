-- Adicionar campo para registrar divergência na solicitação de ração
ALTER TABLE solicitacoes_racao 
ADD COLUMN IF NOT EXISTS divergencia_kg numeric DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN solicitacoes_racao.divergencia_kg IS 
'Diferença entre recebido e solicitado. Negativo = retorno, Positivo = extra';