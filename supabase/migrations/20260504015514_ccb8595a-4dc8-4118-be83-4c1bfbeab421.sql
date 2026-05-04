
CREATE TABLE public.weather_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id uuid,
  integrado_id uuid,
  status text NOT NULL,
  mensagem text,
  duracao_ms integer,
  trigger_tipo text DEFAULT 'cron',
  executado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_weather_sync_log_nucleo ON public.weather_sync_log(nucleo_id, executado_em DESC);
CREATE INDEX idx_weather_sync_log_executado ON public.weather_sync_log(executado_em DESC);

ALTER TABLE public.weather_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access weather_sync_log"
ON public.weather_sync_log FOR ALL
USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "Tenant view weather_sync_log"
ON public.weather_sync_log FOR SELECT
USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "Service role insert weather_sync_log"
ON public.weather_sync_log FOR INSERT
WITH CHECK (true);
