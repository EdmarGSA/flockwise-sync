DROP FUNCTION IF EXISTS public.purge_ambiencia_historico();

CREATE FUNCTION public.purge_ambiencia_historico()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_det jsonb := '{}'::jsonb;
  v_n bigint;
  v_erros text := NULL;
  v_ini timestamptz := clock_timestamp();
BEGIN
  BEGIN
    DELETE FROM public.leituras_sensores WHERE lido_em < now() - interval '30 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('leituras_sensores', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'leituras_sensores: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM public.log_decisao_clima WHERE created_at < now() - interval '14 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('log_decisao_clima', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'log_decisao_clima: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM public.comando_brain WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('comando_brain', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'comando_brain: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM public.eventos_dispositivo_iot WHERE criado_em < now() - interval '30 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('eventos_dispositivo_iot', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'eventos_dispositivo_iot: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM public.historico_estado_canal WHERE created_at < now() - interval '60 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('historico_estado_canal', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'historico_estado_canal: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM public.brain_metrics WHERE created_at < now() - interval '14 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('brain_metrics', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'brain_metrics: ' || SQLERRM || '; ';
  END;

  BEGIN
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '2 days';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_det := v_det || jsonb_build_object('cron_job_run_details', v_n);
  EXCEPTION WHEN OTHERS THEN v_erros := coalesce(v_erros,'') || 'cron.job_run_details: ' || SQLERRM || '; ';
  END;

  BEGIN
    INSERT INTO public.brain_metrics (origem, duracao_ms, erro, detalhes)
    VALUES ('purge',
            (EXTRACT(EPOCH FROM (clock_timestamp() - v_ini)) * 1000)::int,
            v_erros, v_det);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_pg_net_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '5 minutes';
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_dispositivos_offline_iot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_dev RECORD;
BEGIN
  FOR v_dev IN
    SELECT d.id, d.integrado_id, d.nome, d.ultimo_sync
    FROM public.dispositivos_iot d
    WHERE d.ativo = true
      AND (d.ultimo_sync IS NULL OR d.ultimo_sync < now() - INTERVAL '10 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.eventos_dispositivo_iot e
        WHERE e.dispositivo_id = d.id
          AND e.tipo = 'offline'
          AND e.criado_em > COALESCE(d.ultimo_sync, now() - INTERVAL '1 year')
      )
  LOOP
    INSERT INTO public.eventos_dispositivo_iot (dispositivo_id, integrado_id, tipo, detalhes)
    VALUES (v_dev.id, v_dev.integrado_id, 'offline',
      jsonb_build_object('ultimo_sync', v_dev.ultimo_sync, 'nome', v_dev.nome));

    UPDATE public.canais_dispositivo
       SET recuperacao_apos_falha = true
     WHERE dispositivo_id = v_dev.id AND ativo = true;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

DO $$
DECLARE v_id bigint;
BEGIN
  SELECT jobid INTO v_id FROM cron.job WHERE jobname = 'marcar-disp-iot-offline';
  IF v_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_id, schedule => '*/10 * * * *');
  END IF;
END $$;