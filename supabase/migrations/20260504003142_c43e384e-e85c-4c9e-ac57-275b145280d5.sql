
ALTER TABLE public.nucleos
  ADD COLUMN IF NOT EXISTS weather_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE public.galpoes ADD COLUMN IF NOT EXISTS inercia_termica_min integer;
UPDATE public.galpoes SET inercia_termica_min = CASE
  WHEN tipo_pressao::text = 'negativa' THEN 60
  WHEN tipo_pressao::text = 'positiva' THEN 120
  ELSE 90 END WHERE inercia_termica_min IS NULL;

ALTER TABLE public.programa_iluminacao_faixa
  ADD COLUMN IF NOT EXISTS modo_horario text NOT NULL DEFAULT 'fixo' CHECK (modo_horario IN ('fixo','solar')),
  ADD COLUMN IF NOT EXISTS acender_offset_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apagar_offset_min integer NOT NULL DEFAULT 0;

CREATE TABLE public.weather_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id uuid NOT NULL UNIQUE REFERENCES public.nucleos(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  temperatura_c numeric(5,2), umidade_pct numeric(5,2), vento_kmh numeric(5,2),
  vento_direcao_deg integer, uv_index numeric(4,1), precipitacao_mm numeric(6,2),
  condicao_codigo integer, condicao_texto text,
  observado_em timestamptz NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weather_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org weather obs" ON public.weather_observacoes
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE INDEX idx_weather_obs_integrado ON public.weather_observacoes(integrado_id);

CREATE TABLE public.weather_forecast_horario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id uuid NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  hora_prevista timestamptz NOT NULL,
  temperatura_c numeric(5,2), umidade_pct numeric(5,2), vento_kmh numeric(5,2),
  prob_chuva_pct numeric(5,2), precipitacao_mm numeric(6,2), uv_index numeric(4,1),
  condicao_codigo integer, ith numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nucleo_id, hora_prevista)
);
ALTER TABLE public.weather_forecast_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org weather forecast" ON public.weather_forecast_horario
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE INDEX idx_forecast_nucleo_hora ON public.weather_forecast_horario(nucleo_id, hora_prevista);

CREATE TABLE public.solar_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id uuid NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  data date NOT NULL,
  nascer_sol timestamptz, por_sol timestamptz,
  crepusculo_civil_inicio timestamptz, crepusculo_civil_fim timestamptz,
  fotoperiodo_min integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nucleo_id, data)
);
ALTER TABLE public.solar_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org solar" ON public.solar_diario
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE INDEX idx_solar_nucleo_data ON public.solar_diario(nucleo_id, data);

CREATE TABLE public.conforto_termico_ave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_producao text NOT NULL,
  idade_dia_inicio integer NOT NULL, idade_dia_fim integer NOT NULL,
  temp_min_ok numeric(4,1) NOT NULL, temp_max_ok numeric(4,1) NOT NULL,
  temp_min_critico numeric(4,1) NOT NULL, temp_max_critico numeric(4,1) NOT NULL,
  ur_min_ok numeric(4,1) DEFAULT 50, ur_max_ok numeric(4,1) DEFAULT 70,
  ith_max_ok numeric(4,1) DEFAULT 74, ith_max_critico numeric(4,1) DEFAULT 78,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conforto_termico_ave ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all read conforto" ON public.conforto_termico_ave FOR SELECT TO authenticated USING (true);
CREATE POLICY "superadmin write conforto" ON public.conforto_termico_ave FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

INSERT INTO public.conforto_termico_ave (tipo_producao, idade_dia_inicio, idade_dia_fim, temp_min_ok, temp_max_ok, temp_min_critico, temp_max_critico, ith_max_ok, ith_max_critico, observacao) VALUES
  ('frango_corte',1,7,32,34,28,36,76,80,'Pintinho'),
  ('frango_corte',8,14,29,32,25,34,75,79,'Crescimento inicial'),
  ('frango_corte',15,21,26,29,22,32,74,78,'Crescimento intermediário'),
  ('frango_corte',22,28,22,26,18,30,73,77,'Engorda'),
  ('frango_corte',29,35,20,24,16,28,72,76,'Engorda final'),
  ('frango_corte',36,60,18,23,14,27,72,76,'Pré-abate'),
  ('postura',1,7,32,34,28,36,76,80,'Pintinho postura'),
  ('postura',8,42,24,28,18,32,74,78,'Recria'),
  ('postura',43,119,20,26,15,30,74,78,'Pré-postura'),
  ('postura',120,700,18,26,12,30,74,78,'Produção');

CREATE TABLE public.alertas_climaticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  nucleo_id uuid NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE CASCADE,
  galpao_id uuid REFERENCES public.galpoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  severidade text NOT NULL DEFAULT 'media',
  titulo text NOT NULL,
  mensagem text NOT NULL,
  horario_evento timestamptz NOT NULL,
  hora_chave timestamptz,
  horario_acao timestamptz,
  contexto jsonb,
  reconhecido_em timestamptz, reconhecido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.set_alertas_climaticos_hora_chave()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.hora_chave := date_trunc('hour', NEW.horario_evento);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_alertas_climaticos_hora_chave
  BEFORE INSERT OR UPDATE OF horario_evento ON public.alertas_climaticos
  FOR EACH ROW EXECUTE FUNCTION public.set_alertas_climaticos_hora_chave();
ALTER TABLE public.alertas_climaticos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org alertas" ON public.alertas_climaticos
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "update reconhecer alertas" ON public.alertas_climaticos
  FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE UNIQUE INDEX uniq_alerta_dedup ON public.alertas_climaticos(nucleo_id, tipo, hora_chave);
CREATE INDEX idx_alertas_integrado_created ON public.alertas_climaticos(integrado_id, created_at DESC);

CREATE TABLE public.weather_historico_3h (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id uuid NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  ts_3h timestamptz NOT NULL,
  temp_med numeric(5,2), temp_min numeric(5,2), temp_max numeric(5,2),
  ur_med numeric(5,2), ith_med numeric(5,2), ith_max numeric(5,2),
  vento_max numeric(5,2), precipitacao_mm numeric(6,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nucleo_id, ts_3h)
);
ALTER TABLE public.weather_historico_3h ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org weather hist" ON public.weather_historico_3h
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE INDEX idx_hist3h_nucleo_ts ON public.weather_historico_3h(nucleo_id, ts_3h DESC);

CREATE TABLE public.weather_lote_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  data date NOT NULL,
  idade_dias integer,
  temp_min numeric(5,2), temp_med numeric(5,2), temp_max numeric(5,2),
  ur_med numeric(5,2), ith_med numeric(5,2), ith_max numeric(5,2),
  horas_calor integer DEFAULT 0, horas_frio integer DEFAULT 0, horas_ith_alto integer DEFAULT 0,
  dentro_conforto_pct numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lote_id, data)
);
ALTER TABLE public.weather_lote_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select org weather lote" ON public.weather_lote_diario
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE INDEX idx_weatherlote_lote_data ON public.weather_lote_diario(lote_id, data);

INSERT INTO public.tipos_evento_notificacao (codigo, nome, descricao, severidade_padrao, roles_padrao, ativo)
VALUES
  ('clima_calor_critico', 'Onda de calor prevista', 'Temperatura prevista acima da faixa crítica', 'critical', ARRAY['criador','veterinario','admin']::app_role[], true),
  ('clima_frio_critico', 'Onda de frio prevista', 'Temperatura prevista abaixo da faixa crítica', 'critical', ARRAY['criador','veterinario','admin']::app_role[], true),
  ('clima_ith_alto', 'ITH elevado previsto', 'Índice de temperatura e umidade acima do limite', 'warning', ARRAY['criador','veterinario']::app_role[], true),
  ('clima_vento_forte', 'Vento forte previsto', 'Rajadas previstas acima de 50 km/h', 'warning', ARRAY['criador','admin']::app_role[], true)
ON CONFLICT (codigo) DO NOTHING;
