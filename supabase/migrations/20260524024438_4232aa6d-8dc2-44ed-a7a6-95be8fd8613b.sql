
CREATE TABLE IF NOT EXISTS public.sensor_drift_status (
  dispositivo_id uuid PRIMARY KEY REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  galpao_id uuid,
  ultimo_check timestamptz NOT NULL DEFAULT now(),
  amostras integer NOT NULL DEFAULT 0,
  delta_temp_c numeric,
  delta_ur_pct numeric,
  severidade text NOT NULL DEFAULT 'ok' CHECK (severidade IN ('ok','aviso','critico')),
  motivo text,
  excluido_agregacao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drift_galpao ON public.sensor_drift_status(galpao_id);
CREATE INDEX IF NOT EXISTS idx_drift_integrado ON public.sensor_drift_status(integrado_id);

ALTER TABLE public.sensor_drift_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access drift" ON public.sensor_drift_status
  FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "Org pode ver drift dos próprios sensores" ON public.sensor_drift_status
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());

CREATE POLICY "Service role gerencia drift" ON public.sensor_drift_status
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_drift_updated_at
  BEFORE UPDATE ON public.sensor_drift_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tipos_evento_notificacao (codigo, nome, descricao, severidade_padrao, roles_padrao, ativo)
VALUES ('sensor_drift', 'Sensor descalibrado',
        'Sensor com leitura divergente dos pares no mesmo galpão',
        'warning', ARRAY['admin','criador']::app_role[], true)
ON CONFLICT (codigo) DO NOTHING;
