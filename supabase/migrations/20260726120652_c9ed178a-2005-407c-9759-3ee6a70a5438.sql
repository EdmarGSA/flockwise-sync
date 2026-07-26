-- 1) Trigger: nova leitura de sensor aciona o climate-brain (throttle 60s)
CREATE OR REPLACE FUNCTION public.trg_evento_leitura_sensor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ativo boolean;
  v_ultima timestamptz;
BEGIN
  SELECT ativo INTO v_ativo FROM public.feature_flags_sistema WHERE chave = 'event_driven_brain';
  IF NOT COALESCE(v_ativo, false) THEN
    RETURN NULL;
  END IF;

  SELECT MAX(created_at) INTO v_ultima
  FROM public.brain_metrics
  WHERE origem = 'climate-brain' AND created_at > now() - interval '5 minutes';

  IF v_ultima IS NOT NULL AND v_ultima > now() - interval '60 seconds' THEN
    RETURN NULL;
  END IF;

  PERFORM public.call_internal_edge('climate-brain', jsonb_build_object('trigger', 'leitura_sensor'));
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS evento_leitura_sensor ON public.leituras_sensores;
CREATE TRIGGER evento_leitura_sensor
AFTER INSERT ON public.leituras_sensores
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_evento_leitura_sensor();

-- 2) Trigger: novo comando pendente aciona o dispatcher imediatamente
CREATE OR REPLACE FUNCTION public.trg_evento_comando_brain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ativo boolean;
BEGIN
  SELECT ativo INTO v_ativo FROM public.feature_flags_sistema WHERE chave = 'event_driven_brain';
  IF NOT COALESCE(v_ativo, false) THEN
    RETURN NULL;
  END IF;

  IF NEW.status IN ('pendente', 'aprovado') THEN
    PERFORM public.call_internal_edge('brain-dispatcher', jsonb_build_object('trigger', 'comando_brain'));
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS evento_comando_brain ON public.comando_brain;
CREATE TRIGGER evento_comando_brain
AFTER INSERT ON public.comando_brain
FOR EACH ROW
EXECUTE FUNCTION public.trg_evento_comando_brain();

-- 3) Crons viram watchdog
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'climate-brain-1min'), schedule := '*/10 * * * *');
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'brain-dispatcher-15s'), schedule := '* * * * *');

-- 4) Liga a flag
UPDATE public.feature_flags_sistema
SET ativo = true, updated_at = now()
WHERE chave = 'event_driven_brain';