
-- ============================================================
-- C2: Centralize internal anon key in Vault + helper function
-- ============================================================

-- 1) Store anon key in Vault (idempotent)
DO $$
DECLARE
  v_existing uuid;
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGp4dGxmaHhqdGVuaGh6YWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODIxNDAsImV4cCI6MjA4MDU1ODE0MH0.mrGlziI-2FsD8Nq6iR1PBBln5C2W4AypPJ7I2R27HdA';
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'internal_anon_key';
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(v_key, 'internal_anon_key', 'Internal anon key used by pg_cron to invoke edge functions');
  ELSE
    PERFORM vault.update_secret(v_existing, v_key, 'internal_anon_key', 'Internal anon key used by pg_cron to invoke edge functions');
  END IF;
END $$;

-- 2) Helper function to dispatch HTTP POST to an internal edge function
CREATE OR REPLACE FUNCTION public.call_internal_edge(
  p_function text,
  p_body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
  v_req_id bigint;
BEGIN
  IF p_function IS NULL OR length(trim(p_function)) = 0 THEN
    RAISE EXCEPTION 'p_function is required';
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'internal_anon_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'internal_anon_key not found in Vault';
  END IF;

  SELECT net.http_post(
    url := 'https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_key,
      'Authorization', 'Bearer ' || v_key
    ),
    body := COALESCE(p_body, '{}'::jsonb)
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.call_internal_edge(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.call_internal_edge(text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.call_internal_edge(text, jsonb) TO postgres, service_role;

-- 3) Reschedule all cron jobs to use the helper (no plaintext key in command)

-- auto-cortina-every-2-min
SELECT cron.unschedule('auto-cortina-every-2-min');
SELECT cron.schedule('auto-cortina-every-2-min', '*/2 * * * *',
  $cron$SELECT public.call_internal_edge('auto-cortina', jsonb_build_object('time', now()));$cron$);

-- auto-iluminacao-1min
SELECT cron.unschedule('auto-iluminacao-1min');
SELECT cron.schedule('auto-iluminacao-1min', '* * * * *',
  $cron$SELECT public.call_internal_edge('auto-iluminacao');$cron$);

-- auto-qualidade-ar-5min
SELECT cron.unschedule('auto-qualidade-ar-5min');
SELECT cron.schedule('auto-qualidade-ar-5min', '*/5 * * * *',
  $cron$SELECT public.call_internal_edge('auto-qualidade-ar', jsonb_build_object('time', now()));$cron$);

-- auto-sync-sensors-every-5min
SELECT cron.unschedule('auto-sync-sensors-every-5min');
SELECT cron.schedule('auto-sync-sensors-every-5min', '*/5 * * * *',
  $cron$SELECT public.call_internal_edge('auto-sync-sensors', jsonb_build_object('time', now()));$cron$);

-- auto-temperatura-5min
SELECT cron.unschedule('auto-temperatura-5min');
SELECT cron.schedule('auto-temperatura-5min', '*/5 * * * *',
  $cron$SELECT public.call_internal_edge('auto-temperatura', jsonb_build_object('time', now()));$cron$);

-- auto-ventilacao-3min
SELECT cron.unschedule('auto-ventilacao-3min');
SELECT cron.schedule('auto-ventilacao-3min', '*/3 * * * *',
  $cron$SELECT public.call_internal_edge('auto-ventilacao');$cron$);

-- brain-dispatcher-15s (sub-minute interval)
SELECT cron.unschedule('brain-dispatcher-15s');
SELECT cron.schedule('brain-dispatcher-15s', '15 seconds',
  $cron$SELECT public.call_internal_edge('brain-dispatcher');$cron$);

-- brain-iluminacao-madrugada
SELECT cron.unschedule('brain-iluminacao-madrugada');
SELECT cron.schedule('brain-iluminacao-madrugada', '30 6 * * *',
  $cron$SELECT public.call_internal_edge('brain-iluminacao', '{"trigger":"cron"}'::jsonb);$cron$);

-- brain-iluminacao-meio-dia
SELECT cron.unschedule('brain-iluminacao-meio-dia');
SELECT cron.schedule('brain-iluminacao-meio-dia', '0 15 * * *',
  $cron$SELECT public.call_internal_edge('brain-iluminacao', '{"trigger":"cron"}'::jsonb);$cron$);

-- climate-brain-1min
SELECT cron.unschedule('climate-brain-1min');
SELECT cron.schedule('climate-brain-1min', '* * * * *',
  $cron$SELECT public.call_internal_edge('climate-brain');$cron$);

-- climate-learn-hourly
SELECT cron.unschedule('climate-learn-hourly');
SELECT cron.schedule('climate-learn-hourly', '0 * * * *',
  $cron$SELECT public.call_internal_edge('climate-learn');$cron$);

-- detect-sensor-drift-hourly
SELECT cron.unschedule('detect-sensor-drift-hourly');
SELECT cron.schedule('detect-sensor-drift-hourly', '0 * * * *',
  $cron$SELECT public.call_internal_edge('detect-sensor-drift');$cron$);

-- intelbras-snapshot-all-5min
SELECT cron.unschedule('intelbras-snapshot-all-5min');
SELECT cron.schedule('intelbras-snapshot-all-5min', '*/5 * * * *',
  $cron$SELECT public.call_internal_edge('intelbras-bridge/snapshot-all-cron', jsonb_build_object('triggered_at', now()));$cron$);

-- sm-wt-health-monitor-5min
SELECT cron.unschedule('sm-wt-health-monitor-5min');
SELECT cron.schedule('sm-wt-health-monitor-5min', '*/5 * * * *',
  $cron$SELECT public.call_internal_edge('sm-wt-health-monitor');$cron$);

-- weather-aggregator-3h
SELECT cron.unschedule('weather-aggregator-3h');
SELECT cron.schedule('weather-aggregator-3h', '0 */3 * * *',
  $cron$SELECT public.call_internal_edge('weather-aggregator', '{"mode":"3h"}'::jsonb);$cron$);

-- weather-aggregator-daily
SELECT cron.unschedule('weather-aggregator-daily');
SELECT cron.schedule('weather-aggregator-daily', '30 0 * * *',
  $cron$SELECT public.call_internal_edge('weather-aggregator', '{"mode":"daily"}'::jsonb);$cron$);

-- weather-sync-30m
SELECT cron.unschedule('weather-sync-30m');
SELECT cron.schedule('weather-sync-30m', '*/30 * * * *',
  $cron$SELECT public.call_internal_edge('weather-sync');$cron$);

-- weather-sync-30min (duplicate of weather-sync-30m kept intentionally)
SELECT cron.unschedule('weather-sync-30min');
SELECT cron.schedule('weather-sync-30min', '*/30 * * * *',
  $cron$SELECT public.call_internal_edge('weather-sync');$cron$);
