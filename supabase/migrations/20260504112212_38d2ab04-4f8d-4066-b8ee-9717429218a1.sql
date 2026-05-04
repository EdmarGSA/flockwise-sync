-- Onda 1 + 2: Curva climática diária por linhagem + Histerese e segurança

-- 1) Tabela mestre de curvas (templates globais ou por organização)
CREATE TABLE public.curva_climatica_referencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid,                         -- NULL = template global público
  nome text NOT NULL,
  linhagem text NOT NULL,                    -- cobb_500, ross_308, hubbard_flex, lohmann_brown, hy_line_w36
  sexo text NOT NULL DEFAULT 'misto',        -- macho, femea, misto
  tipo_producao text NOT NULL DEFAULT 'frango_corte', -- frango_corte, postura, matriz
  publica boolean NOT NULL DEFAULT false,
  fonte text,                                -- 'Cobb 500 Mgmt Guide 2022', etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_curva_clim_org ON public.curva_climatica_referencia(integrado_id);
CREATE INDEX idx_curva_clim_linhagem ON public.curva_climatica_referencia(linhagem, sexo, tipo_producao);

-- 2) Pontos da curva (1 linha por dia de idade)
CREATE TABLE public.curva_climatica_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curva_id uuid NOT NULL REFERENCES public.curva_climatica_referencia(id) ON DELETE CASCADE,
  dia_idade int NOT NULL CHECK (dia_idade >= 0 AND dia_idade <= 700),
  temp_alvo_c numeric NOT NULL,
  temp_min_alarme_c numeric NOT NULL,
  temp_max_alarme_c numeric NOT NULL,
  ur_min_pct numeric DEFAULT 50,
  ur_max_pct numeric DEFAULT 70,
  velocidade_ar_min_ms numeric DEFAULT 0.1,
  velocidade_ar_max_ms numeric DEFAULT 0.3,
  nh3_max_ppm numeric DEFAULT 20,
  co2_max_ppm numeric DEFAULT 3000,
  vazao_min_m3h_por_kg numeric DEFAULT 0.5,
  ith_alarme_amarelo numeric DEFAULT 74,
  ith_alarme_vermelho numeric DEFAULT 78,
  UNIQUE (curva_id, dia_idade)
);

CREATE INDEX idx_curva_ponto_curva ON public.curva_climatica_ponto(curva_id, dia_idade);

-- 3) Vincular curva ao lote
ALTER TABLE public.lotes
  ADD COLUMN IF NOT EXISTS curva_climatica_id uuid REFERENCES public.curva_climatica_referencia(id) ON DELETE SET NULL;

-- 4) Configuração de histerese/segurança por organização
CREATE TABLE public.config_histerese_organizacao (
  integrado_id uuid PRIMARY KEY,
  deadband_temp_c numeric NOT NULL DEFAULT 0.5,
  tempo_min_on_aquecedor_seg int NOT NULL DEFAULT 60,
  tempo_min_off_aquecedor_seg int NOT NULL DEFAULT 300,
  tempo_min_on_ventilador_seg int NOT NULL DEFAULT 120,
  tempo_min_off_ventilador_seg int NOT NULL DEFAULT 60,
  tempo_min_on_nebulizador_seg int NOT NULL DEFAULT 180,
  tempo_min_off_nebulizador_seg int NOT NULL DEFAULT 120,
  ith_amarelo numeric NOT NULL DEFAULT 74,
  ith_vermelho numeric NOT NULL DEFAULT 78,
  modo_seguro_vent_min_pct numeric NOT NULL DEFAULT 30,
  sensor_max_idade_min int NOT NULL DEFAULT 15, -- considera leitura velha
  protege_pintinho_ate_dias int NOT NULL DEFAULT 7, -- não desliga aquecedor se sensor falhar
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Estender canais para histerese e CFM
ALTER TABLE public.canais_dispositivo
  ADD COLUMN IF NOT EXISTS ultimo_on_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_off_em timestamptz,
  ADD COLUMN IF NOT EXISTS cfm_nominal numeric,
  ADD COLUMN IF NOT EXISTS watts_nominal numeric;

-- 6) Log de decisão (cadeia de razões para auditoria)
CREATE TABLE public.log_decisao_clima (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid,
  lote_id uuid,
  canal_id uuid,
  dispositivo_id uuid,
  funcao_automacao text,
  estado_decidido text,                      -- 'on'|'off'|'mantido'
  estagio text,                              -- 'min'|'transicao'|'tunel'|'heat_stress'|'noturno'|'normal'
  temp_lida numeric,
  ur_lida numeric,
  ith_calc numeric,
  setpoint_alvo numeric,
  reason_chain jsonb NOT NULL,               -- ["temp 29>setpoint+0.5", "ITH 76 >= amarelo", ...]
  bloqueado_por text,                        -- 'tempo_minimo_on'|'tempo_minimo_off'|'sensor_falho'|null
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_log_decisao_galpao_data ON public.log_decisao_clima(galpao_id, created_at DESC);
CREATE INDEX idx_log_decisao_lote_data ON public.log_decisao_clima(lote_id, created_at DESC);
CREATE INDEX idx_log_decisao_org_data ON public.log_decisao_clima(integrado_id, created_at DESC);

-- 7) RLS
ALTER TABLE public.curva_climatica_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curva_climatica_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_histerese_organizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_decisao_clima ENABLE ROW LEVEL SECURITY;

-- Curvas: ver públicas + da organização; mutar só da organização
CREATE POLICY "ver curvas publicas e da org" ON public.curva_climatica_referencia
  FOR SELECT TO authenticated
  USING (publica = true OR integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "inserir curvas org" ON public.curva_climatica_referencia
  FOR INSERT TO authenticated
  WITH CHECK ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

CREATE POLICY "atualizar curvas org" ON public.curva_climatica_referencia
  FOR UPDATE TO authenticated
  USING ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

CREATE POLICY "excluir curvas org" ON public.curva_climatica_referencia
  FOR DELETE TO authenticated
  USING ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

-- Pontos seguem permissão da curva-pai
CREATE POLICY "ver pontos curva acessivel" ON public.curva_climatica_ponto
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.curva_climatica_referencia c
    WHERE c.id = curva_id
      AND (c.publica = true OR c.integrado_id = get_my_integrado_id() OR is_superadmin())
  ));

CREATE POLICY "mutar pontos curva da org" ON public.curva_climatica_ponto
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.curva_climatica_referencia c
    WHERE c.id = curva_id
      AND ((c.integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.curva_climatica_referencia c
    WHERE c.id = curva_id
      AND ((c.integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin())
  ));

-- Config histerese
CREATE POLICY "ver config histerese org" ON public.config_histerese_organizacao
  FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "mutar config histerese org" ON public.config_histerese_organizacao
  FOR ALL TO authenticated
  USING ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin())
  WITH CHECK ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

-- Log decisão (somente leitura para org; insert pelo service role)
CREATE POLICY "ver log decisao org" ON public.log_decisao_clima
  FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin());

-- 8) Triggers updated_at
CREATE TRIGGER trg_curva_clim_ref_upd BEFORE UPDATE ON public.curva_climatica_referencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_config_hist_upd BEFORE UPDATE ON public.config_histerese_organizacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();