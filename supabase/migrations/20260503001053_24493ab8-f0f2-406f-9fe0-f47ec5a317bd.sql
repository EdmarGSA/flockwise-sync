
-- Programa de iluminação por lote/idade
CREATE TABLE public.programa_iluminacao_lote (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo_producao TEXT NOT NULL DEFAULT 'frango_corte', -- frango_corte | postura | matriz
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prog_ilum_integrado ON public.programa_iluminacao_lote(integrado_id, ativo);

-- Faixas de idade dentro de um programa
CREATE TABLE public.programa_iluminacao_faixa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programa_id UUID NOT NULL REFERENCES public.programa_iluminacao_lote(id) ON DELETE CASCADE,
  dia_inicio INTEGER NOT NULL,
  dia_fim INTEGER NOT NULL,
  horas_luz NUMERIC(4,2) NOT NULL,
  -- Blocos de luz no dia: [{"acender":"04:00","apagar":"22:00","intensidade_pct":100}]
  blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ramp_up_min INTEGER NOT NULL DEFAULT 0,
  ramp_down_min INTEGER NOT NULL DEFAULT 0,
  intensidade_pct INTEGER NOT NULL DEFAULT 100 CHECK (intensidade_pct BETWEEN 0 AND 100),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (dia_fim >= dia_inicio AND dia_inicio >= 0)
);

CREATE INDEX idx_prog_ilum_faixa_programa ON public.programa_iluminacao_faixa(programa_id, dia_inicio);

-- Override manual (forçar on/off por tempo determinado)
CREATE TABLE public.override_iluminacao_canal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canal_id UUID NOT NULL REFERENCES public.canais_dispositivo(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  estado_forcado TEXT NOT NULL CHECK (estado_forcado IN ('on','off','auto')),
  intensidade_pct INTEGER CHECK (intensidade_pct BETWEEN 0 AND 100),
  ate_quando TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_override_ilum_canal ON public.override_iluminacao_canal(canal_id, ate_quando);
CREATE INDEX idx_override_ilum_integrado ON public.override_iluminacao_canal(integrado_id);

-- Vincular lote a programa
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS programa_iluminacao_id UUID
  REFERENCES public.programa_iluminacao_lote(id) ON DELETE SET NULL;

-- Suporte a dimerização em canal (PWM via ESP32)
ALTER TABLE public.canais_dispositivo
  ADD COLUMN IF NOT EXISTS suporta_dimer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intensidade_atual INTEGER CHECK (intensidade_atual BETWEEN 0 AND 100);

-- RLS
ALTER TABLE public.programa_iluminacao_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programa_iluminacao_faixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_iluminacao_canal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org pode gerenciar programas de iluminação"
  ON public.programa_iluminacao_lote FOR ALL TO authenticated
  USING (integrado_id = get_my_integrado_id() AND can_modify_data())
  WITH CHECK (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE POLICY "org pode visualizar programas de iluminação"
  ON public.programa_iluminacao_lote FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "org pode gerenciar faixas via programa"
  ON public.programa_iluminacao_faixa FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programa_iluminacao_lote p
                 WHERE p.id = programa_id AND p.integrado_id = get_my_integrado_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programa_iluminacao_lote p
                      WHERE p.id = programa_id AND p.integrado_id = get_my_integrado_id()));

CREATE POLICY "org pode gerenciar overrides de iluminação"
  ON public.override_iluminacao_canal FOR ALL TO authenticated
  USING (integrado_id = get_my_integrado_id() AND can_modify_data())
  WITH CHECK (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE POLICY "org pode visualizar overrides de iluminação"
  ON public.override_iluminacao_canal FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id());

-- Trigger updated_at
CREATE TRIGGER trg_prog_ilum_updated_at
  BEFORE UPDATE ON public.programa_iluminacao_lote
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: criar programas padrão para uma organização
CREATE OR REPLACE FUNCTION public.seed_programas_iluminacao_default(p_integrado_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_corte UUID;
  v_postura UUID;
BEGIN
  -- Padrão Corte
  IF NOT EXISTS (SELECT 1 FROM programa_iluminacao_lote
                 WHERE integrado_id = p_integrado_id AND tipo_producao = 'frango_corte' AND is_default = true) THEN
    INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default)
    VALUES (p_integrado_id, 'Padrão Corte', 'frango_corte', 'Programa padrão para frango de corte com escotofase progressiva', true)
    RETURNING id INTO v_corte;

    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct) VALUES
      (v_corte, 1, 7, 23, '[{"acender":"00:00","apagar":"23:00","intensidade_pct":100}]'::jsonb, 5, 5, 100),
      (v_corte, 8, 14, 20, '[{"acender":"04:00","apagar":"00:00","intensidade_pct":80}]'::jsonb, 15, 15, 80),
      (v_corte, 15, 21, 18, '[{"acender":"05:00","apagar":"23:00","intensidade_pct":60}]'::jsonb, 20, 20, 60),
      (v_corte, 22, 60, 18, '[{"acender":"05:00","apagar":"23:00","intensidade_pct":50}]'::jsonb, 20, 20, 50);
  END IF;

  -- Padrão Postura
  IF NOT EXISTS (SELECT 1 FROM programa_iluminacao_lote
                 WHERE integrado_id = p_integrado_id AND tipo_producao = 'postura' AND is_default = true) THEN
    INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default)
    VALUES (p_integrado_id, 'Padrão Postura', 'postura', 'Cria 23→8h, recria 8h fixo, produção 8→16h estímulo', true)
    RETURNING id INTO v_postura;

    -- Cria (1-42 dias): 23h diminuindo até 8h
    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct) VALUES
      (v_postura, 1, 7, 23, '[{"acender":"00:00","apagar":"23:00","intensidade_pct":100}]'::jsonb, 5, 5, 100),
      (v_postura, 8, 21, 16, '[{"acender":"05:00","apagar":"21:00","intensidade_pct":60}]'::jsonb, 15, 15, 60),
      (v_postura, 22, 42, 12, '[{"acender":"06:00","apagar":"18:00","intensidade_pct":40}]'::jsonb, 20, 20, 40),
      -- Recria (43-119 dias / 6-17 sem): 8h fixo
      (v_postura, 43, 119, 8, '[{"acender":"06:00","apagar":"14:00","intensidade_pct":40}]'::jsonb, 20, 20, 40),
      -- Estímulo (120-160): 8 → 14h em incrementos
      (v_postura, 120, 133, 10, '[{"acender":"05:00","apagar":"15:00","intensidade_pct":60}]'::jsonb, 20, 20, 60),
      (v_postura, 134, 147, 12, '[{"acender":"04:00","apagar":"16:00","intensidade_pct":80}]'::jsonb, 20, 20, 80),
      (v_postura, 148, 160, 14, '[{"acender":"04:00","apagar":"18:00","intensidade_pct":100}]'::jsonb, 20, 20, 100),
      -- Produção (161+): 16h
      (v_postura, 161, 700, 16, '[{"acender":"04:00","apagar":"20:00","intensidade_pct":100}]'::jsonb, 20, 20, 100);
  END IF;
END;
$$;

-- Backfill: criar programas padrão para integrados existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT integrado_id FROM profiles WHERE integrado_id IS NOT NULL LOOP
    PERFORM seed_programas_iluminacao_default(r.integrado_id);
  END LOOP;
END $$;

-- Estender handle_new_user para criar programas padrão em novas orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_integrado_id uuid;
BEGIN
  target_integrado_id := COALESCE(
    (new.raw_user_meta_data ->> 'integrado_id')::uuid,
    new.id
  );

  INSERT INTO public.profiles (id, full_name, integrado_id)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', target_integrado_id);

  IF target_integrado_id = new.id THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');

    INSERT INTO public.mortalidade_media (
      integrado_id, linhagem, sexo,
      mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias,
      mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias,
      mortalidade_acima_42_dias
    ) VALUES (
      new.id, 'cobb_500', 'misto',
      0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8
    );

    PERFORM public.seed_programas_iluminacao_default(new.id);
  END IF;

  RETURN new;
END;
$$;
