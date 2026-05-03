-- Trigger: garante apenas 1 programa default por (integrado_id, tipo_producao)
CREATE OR REPLACE FUNCTION public.ensure_single_default_programa_iluminacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.programa_iluminacao_lote
       SET is_default = false
     WHERE integrado_id = NEW.integrado_id
       AND tipo_producao = NEW.tipo_producao
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_prog_ilum ON public.programa_iluminacao_lote;
CREATE TRIGGER trg_single_default_prog_ilum
BEFORE INSERT OR UPDATE OF is_default ON public.programa_iluminacao_lote
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_programa_iluminacao();