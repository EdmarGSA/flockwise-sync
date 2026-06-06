
CREATE OR REPLACE FUNCTION public.purge_ambiencia_historico()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hist int := 0;
  v_log int := 0;
  v_evt int := 0;
  v_cmd int := 0;
BEGIN
  DELETE FROM public.historico_estado_canal
   WHERE created_at < now() - INTERVAL '60 days';
  GET DIAGNOSTICS v_hist = ROW_COUNT;

  DELETE FROM public.log_decisao_clima
   WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_log = ROW_COUNT;

  DELETE FROM public.eventos_dispositivo_iot
   WHERE criado_em < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_evt = ROW_COUNT;

  DELETE FROM public.comando_brain
   WHERE status IN ('enviado','falhou','ignorado')
     AND COALESCE(enviado_em, created_at) < now() - INTERVAL '45 days';
  GET DIAGNOSTICS v_cmd = ROW_COUNT;

  PERFORM public.log_secdef_call(
    'purge_ambiencia_historico',
    NULL,
    jsonb_build_object(
      'historico_estado_canal', v_hist,
      'log_decisao_clima', v_log,
      'eventos_dispositivo_iot', v_evt,
      'comando_brain', v_cmd
    )
  );

  RETURN jsonb_build_object(
    'historico_estado_canal', v_hist,
    'log_decisao_clima', v_log,
    'eventos_dispositivo_iot', v_evt,
    'comando_brain', v_cmd
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_ambiencia_historico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_ambiencia_historico() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-ambiencia-historico-daily') THEN
    PERFORM cron.unschedule('purge-ambiencia-historico-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-ambiencia-historico-daily',
  '15 3 * * *',
  $$ SELECT public.purge_ambiencia_historico(); $$
);
