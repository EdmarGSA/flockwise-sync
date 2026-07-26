-- ============ ETAPA 0: métricas e flags ============
CREATE TABLE IF NOT EXISTS public.brain_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid,
  origem text NOT NULL DEFAULT 'climate-brain',
  duracao_ms integer,
  galpoes_processados integer NOT NULL DEFAULT 0,
  sensores_lidos integer NOT NULL DEFAULT 0,
  decisoes_alteradas integer NOT NULL DEFAULT 0,
  decisoes_ignoradas integer NOT NULL DEFAULT 0,
  comandos_enviados integer NOT NULL DEFAULT 0,
  comandos_ignorados integer NOT NULL DEFAULT 0,
  erro text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brain_metrics TO authenticated;
GRANT ALL ON public.brain_metrics TO service_role;
ALTER TABLE public.brain_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brain_metrics_select_org" ON public.brain_metrics;
CREATE POLICY "brain_metrics_select_org" ON public.brain_metrics
  FOR SELECT TO authenticated
  USING (integrado_id IS NULL OR integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE INDEX IF NOT EXISTS idx_brain_metrics_created ON public.brain_metrics (created_at DESC);

CREATE TABLE IF NOT EXISTS public.feature_flags_sistema (
  chave text PRIMARY KEY,
  ativo boolean NOT NULL DEFAULT false,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags_sistema TO authenticated;
GRANT ALL ON public.feature_flags_sistema TO service_role;
ALTER TABLE public.feature_flags_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flags_select_all" ON public.feature_flags_sistema;
CREATE POLICY "flags_select_all" ON public.feature_flags_sistema
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "flags_manage_superadmin" ON public.feature_flags_sistema;
CREATE POLICY "flags_manage_superadmin" ON public.feature_flags_sistema
  FOR ALL TO authenticated
  USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP TRIGGER IF EXISTS trg_flags_updated_at ON public.feature_flags_sistema;
CREATE TRIGGER trg_flags_updated_at BEFORE UPDATE ON public.feature_flags_sistema
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags_sistema (chave, ativo, descricao) VALUES
  ('smart_logging', false, 'Grava decisao climatica apenas quando muda ou a cada 15 min (heartbeat)'),
  ('smart_commands', false, 'Nao cria/atualiza comando quando o estado desejado ja e o estado atual'),
  ('crons_consolidados', false, 'Climate Brain orquestra ventilacao/cortina/nebulizacao/qualidade do ar'),
  ('event_driven_brain', false, 'Brain reage a eventos de sensores; cron vira watchdog de 10 min')
ON CONFLICT (chave) DO NOTHING;

-- ============ ETAPA 1: recuperacao de espaco (sem bloqueio longo) ============
DROP INDEX IF EXISTS public.idx_log_decisao_lote_data;

TRUNCATE net._http_response;
TRUNCATE net.http_request_queue;

DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days' OR end_time IS NULL;

-- ============ ETAPA 2: retencao continua ============
CREATE OR REPLACE FUNCTION public.purge_pg_net_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '5 minutes';
  DELETE FROM net.http_request_queue WHERE created < now() - interval '10 minutes';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_pg_net_responses() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_ambiencia_historico()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v jsonb := '{}'::jsonb;
BEGIN
  DELETE FROM public.historico_estado_canal WHERE created_at < now() - interval '30 days';
  DELETE FROM public.eventos_dispositivo_iot WHERE created_at < now() - interval '30 days';
  DELETE FROM public.log_decisao_clima      WHERE created_at < now() - interval '14 days';
  DELETE FROM public.comando_brain          WHERE created_at < now() - interval '30 days';
  DELETE FROM public.leituras_sensores      WHERE lido_em    < now() - interval '30 days';
  DELETE FROM public.brain_metrics          WHERE created_at < now() - interval '7 days';
  DELETE FROM public.log_automacao_temperatura WHERE created_at < now() - interval '30 days';
  DELETE FROM public.weather_sync_log       WHERE created_at < now() - interval '30 days';
  DELETE FROM cron.job_run_details          WHERE end_time   < now() - interval '2 days';
  v := jsonb_build_object('ok', true, 'executado_em', now());
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_ambiencia_historico() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('purge-pg-net-10min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='purge-pg-net-10min');
SELECT cron.schedule('purge-pg-net-10min', '*/10 * * * *', $$SELECT public.purge_pg_net_responses();$$);

-- ============ manutencao: autovacuum agressivo ============
ALTER TABLE public.comando_brain     SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.log_decisao_clima SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.leituras_sensores SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.historico_estado_canal SET (autovacuum_vacuum_scale_factor = 0.05);