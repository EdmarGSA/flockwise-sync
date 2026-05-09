
-- 1. aprendizado_galpao
CREATE TABLE public.aprendizado_galpao (
  galpao_id uuid PRIMARY KEY REFERENCES public.galpoes(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  offset_temp_aprendido_c numeric NOT NULL DEFAULT 0,
  offset_ur_aprendido_pct numeric NOT NULL DEFAULT 0,
  inercia_estimada_min numeric NOT NULL DEFAULT 30,
  fator_isolamento numeric NOT NULL DEFAULT 1.0,
  fator_perda_calor_noturna numeric NOT NULL DEFAULT 1.0,
  amostras_treinadas integer NOT NULL DEFAULT 0,
  ultimo_treino_em timestamptz,
  modelo_versao integer NOT NULL DEFAULT 1,
  metricas jsonb,
  narrativa_ia text,
  narrativa_atualizada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_offset_temp_safe CHECK (offset_temp_aprendido_c BETWEEN -2 AND 2),
  CONSTRAINT chk_offset_ur_safe CHECK (offset_ur_aprendido_pct BETWEEN -10 AND 10)
);
ALTER TABLE public.aprendizado_galpao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver aprendizado galpao" ON public.aprendizado_galpao FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "mutar aprendizado galpao" ON public.aprendizado_galpao FOR ALL TO authenticated
  USING ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin())
  WITH CHECK ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

CREATE TRIGGER trg_aprendizado_galpao_updated_at BEFORE UPDATE ON public.aprendizado_galpao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. programa_nebulizacao_galpao
CREATE TABLE public.programa_nebulizacao_galpao (
  galpao_id uuid PRIMARY KEY REFERENCES public.galpoes(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ur_max_pct numeric NOT NULL DEFAULT 75,
  ciclo_on_seg integer NOT NULL DEFAULT 30,
  ciclo_off_seg integer NOT NULL DEFAULT 120,
  cooldown_seg integer NOT NULL DEFAULT 120,
  idade_minima_dias integer NOT NULL DEFAULT 14,
  ventilacao_min_pct integer NOT NULL DEFAULT 70,
  delta_temp_acionar_c numeric NOT NULL DEFAULT 1.0,
  ultimo_acionamento_em timestamptz,
  ultimo_estado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programa_nebulizacao_galpao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver programa neb" ON public.programa_nebulizacao_galpao FOR SELECT TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "mutar programa neb" ON public.programa_nebulizacao_galpao FOR ALL TO authenticated
  USING ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin())
  WITH CHECK ((integrado_id = get_my_integrado_id() AND can_modify_data()) OR is_superadmin());

CREATE TRIGGER trg_programa_neb_updated_at BEFORE UPDATE ON public.programa_nebulizacao_galpao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. extensão programa_ventilacao_galpao
ALTER TABLE public.programa_ventilacao_galpao
  ADD COLUMN IF NOT EXISTS troca_ar_brooding_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS troca_ar_brooding_max_pct integer NOT NULL DEFAULT 25
    CHECK (troca_ar_brooding_max_pct BETWEEN 5 AND 50);

-- 4. extensão log_decisao_clima
ALTER TABLE public.log_decisao_clima
  ADD COLUMN IF NOT EXISTS modo_dominante text,
  ADD COLUMN IF NOT EXISTS offset_aprendido_aplicado_c numeric;
