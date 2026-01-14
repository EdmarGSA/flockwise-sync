
-- 1. Corrigir dados demo com valores de mortos absurdos
UPDATE recebimento_lotes 
SET quantidade_mortos = 0
WHERE quantidade_mortos >= 1000 
  AND lote_id IN (
    SELECT l.id FROM lotes l 
    JOIN profiles p ON l.integrado_id = p.id 
    WHERE p.is_demo = true
  );

-- 2. Fechar lote duplicado no GP 01 (mantendo apenas um)
UPDATE lotes 
SET status = 'fechado'
WHERE id = '5bfa45f1-a3d8-4373-a4dd-4e42f14831a5';

-- 3. Criar função de validação para impedir múltiplos lotes ativos no mesmo galpão
CREATE OR REPLACE FUNCTION public.validate_unique_active_lote_per_galpao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se já existe lote ativo neste galpão (excluindo o próprio registro em caso de UPDATE)
  IF EXISTS (
    SELECT 1 FROM lotes 
    WHERE galpao_id = NEW.galpao_id 
      AND status IN ('previsao', 'alojado', 'saiu_para_entrega')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Este galpão já possui um lote ativo. Feche ou finalize o lote existente antes de criar um novo.';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Criar trigger na tabela lotes
DROP TRIGGER IF EXISTS check_unique_active_lote ON lotes;
CREATE TRIGGER check_unique_active_lote
BEFORE INSERT OR UPDATE ON lotes
FOR EACH ROW
WHEN (NEW.status IN ('previsao', 'alojado', 'saiu_para_entrega'))
EXECUTE FUNCTION public.validate_unique_active_lote_per_galpao();
