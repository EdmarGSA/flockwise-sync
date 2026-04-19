-- 1. Estender regras_temperatura_lote com histerese e limites de operação do nebulizador
ALTER TABLE public.regras_temperatura_lote
  ADD COLUMN IF NOT EXISTS nebulizador_temp_off_c numeric,
  ADD COLUMN IF NOT EXISTS nebulizador_umid_off_pct numeric,
  ADD COLUMN IF NOT EXISTS nebulizador_min_duracao_seg integer DEFAULT 180,
  ADD COLUMN IF NOT EXISTS nebulizador_cooldown_seg integer DEFAULT 120;

COMMENT ON COLUMN public.regras_temperatura_lote.nebulizador_temp_off_c IS 'Temp para desligar nebulizador (histerese). Default: temp_max_c - 1';
COMMENT ON COLUMN public.regras_temperatura_lote.nebulizador_umid_off_pct IS 'Umidade % para desligar nebulizador (histerese). Default: umidade_max_pct + 5';

-- 2. Programa de cortina por faixa etária
CREATE TABLE IF NOT EXISTS public.programa_cortina_lote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  nome text NOT NULL DEFAULT 'Padrão',
  dia_inicio integer NOT NULL,
  dia_fim integer NOT NULL,
  hora_fechar time NOT NULL DEFAULT '19:00:00',
  hora_abrir time NOT NULL DEFAULT '06:00:00',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cortina_dias CHECK (dia_fim >= dia_inicio AND dia_inicio >= 0)
);

ALTER TABLE public.programa_cortina_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own programa_cortina"
  ON public.programa_cortina_lote
  FOR ALL TO authenticated
  USING (integrado_id = get_my_integrado_id())
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE TRIGGER trg_programa_cortina_updated
  BEFORE UPDATE ON public.programa_cortina_lote
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_programa_cortina_integrado ON public.programa_cortina_lote(integrado_id, ativo);

-- 3. Config de alarme (técnico + zootécnico) por integrado
CREATE TABLE IF NOT EXISTS public.config_alarme_lote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL UNIQUE,
  -- Falhas técnicas
  sensor_offline_min integer NOT NULL DEFAULT 30,
  temp_fora_faixa_min integer NOT NULL DEFAULT 15,
  comando_falha_count integer NOT NULL DEFAULT 3,
  internet_offline_min integer NOT NULL DEFAULT 60,
  -- Emergências zootécnicas
  temp_critica_c numeric NOT NULL DEFAULT 35.0,
  umid_critica_min_pct numeric NOT NULL DEFAULT 30.0,
  umid_critica_max_pct numeric NOT NULL DEFAULT 85.0,
  mortalidade_subita_pct numeric NOT NULL DEFAULT 0.5,
  -- Configuração do alarme
  alarme_duracao_seg integer NOT NULL DEFAULT 300,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_alarme_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own config_alarme"
  ON public.config_alarme_lote
  FOR ALL TO authenticated
  USING (integrado_id = get_my_integrado_id())
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE TRIGGER trg_config_alarme_updated
  BEFORE UPDATE ON public.config_alarme_lote
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Histórico de estado de canal (para histerese, duração mínima e cooldown)
CREATE TABLE IF NOT EXISTS public.historico_estado_canal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id uuid NOT NULL REFERENCES public.canais_dispositivo(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  estado text NOT NULL CHECK (estado IN ('on','off')),
  ligado_em timestamptz,
  desligado_em timestamptz,
  motivo text,
  contexto jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_estado_canal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own historico_estado_canal"
  ON public.historico_estado_canal
  FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "System can insert historico_estado_canal"
  ON public.historico_estado_canal
  FOR INSERT TO authenticated
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE INDEX IF NOT EXISTS idx_hist_estado_canal_recent
  ON public.historico_estado_canal(canal_id, created_at DESC);

-- 5. Disparos de alarme (auditoria + dedupe)
CREATE TABLE IF NOT EXISTS public.alarmes_disparados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid REFERENCES public.galpoes(id) ON DELETE SET NULL,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  canal_id uuid REFERENCES public.canais_dispositivo(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  severidade text NOT NULL DEFAULT 'critico' CHECK (severidade IN ('aviso','critico','emergencia')),
  mensagem text NOT NULL,
  contexto jsonb,
  acionado_em timestamptz NOT NULL DEFAULT now(),
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz
);

ALTER TABLE public.alarmes_disparados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alarmes"
  ON public.alarmes_disparados
  FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update own alarmes"
  ON public.alarmes_disparados
  FOR UPDATE TO authenticated
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "System can insert alarmes"
  ON public.alarmes_disparados
  FOR INSERT TO authenticated
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE INDEX IF NOT EXISTS idx_alarmes_recent
  ON public.alarmes_disparados(integrado_id, acionado_em DESC);
CREATE INDEX IF NOT EXISTS idx_alarmes_ativos
  ON public.alarmes_disparados(integrado_id, resolvido) WHERE resolvido = false;