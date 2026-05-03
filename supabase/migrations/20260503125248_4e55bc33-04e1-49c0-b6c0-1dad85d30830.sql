
CREATE TABLE public.config_estimulo_postura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE UNIQUE,
  integrado_id uuid NOT NULL,
  idade_min_semanas integer NOT NULL DEFAULT 17,
  peso_min_kg numeric NOT NULL DEFAULT 1.45,
  horas_inicio numeric NOT NULL DEFAULT 9,
  horas_alvo numeric NOT NULL DEFAULT 16,
  ganho_semanal_min integer NOT NULL DEFAULT 30,
  intensidade_pct integer NOT NULL DEFAULT 60,
  auto_aplicar boolean NOT NULL DEFAULT false,
  aplicado_em timestamptz,
  programa_gerado_id uuid REFERENCES public.programa_iluminacao_lote(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_estimulo_postura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org view estimulo" ON public.config_estimulo_postura FOR SELECT
  USING (integrado_id = get_my_integrado_id());
CREATE POLICY "org insert estimulo" ON public.config_estimulo_postura FOR INSERT
  WITH CHECK (integrado_id = get_my_integrado_id() AND can_modify_data());
CREATE POLICY "org update estimulo" ON public.config_estimulo_postura FOR UPDATE
  USING (integrado_id = get_my_integrado_id() AND can_modify_data());
CREATE POLICY "org delete estimulo" ON public.config_estimulo_postura FOR DELETE
  USING (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE TRIGGER trg_config_estimulo_postura_updated_at
  BEFORE UPDATE ON public.config_estimulo_postura
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.aplicar_estimulo_postura(p_lote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote RECORD;
  v_cfg RECORD;
  v_idade_dias integer;
  v_idade_sem integer;
  v_horas numeric;
  v_dia integer;
  v_dia_fim integer;
  v_ganho_h numeric;
  v_acender text;
  v_apagar text;
  v_programa_id uuid;
  v_blocos jsonb;
BEGIN
  SELECT * INTO v_lote FROM lotes WHERE id = p_lote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado'; END IF;
  IF v_lote.integrado_id != get_my_integrado_id() AND NOT is_superadmin() THEN
    RAISE EXCEPTION 'Sem acesso ao lote';
  END IF;
  IF v_lote.data_alojamento IS NULL THEN
    RAISE EXCEPTION 'Lote sem data de alojamento';
  END IF;

  SELECT * INTO v_cfg FROM config_estimulo_postura WHERE lote_id = p_lote_id;
  IF NOT FOUND THEN
    INSERT INTO config_estimulo_postura (lote_id, integrado_id) VALUES (p_lote_id, v_lote.integrado_id)
    RETURNING * INTO v_cfg;
  END IF;

  PERFORM log_secdef_call('aplicar_estimulo_postura', p_lote_id::text, NULL);

  v_idade_dias := GREATEST(1, (CURRENT_DATE - v_lote.data_alojamento)::integer + 1);
  v_idade_sem := (v_idade_dias / 7) + 1;

  -- Cria programa dedicado
  INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default, ativo)
  VALUES (
    v_lote.integrado_id,
    'Estímulo Postura - Lote ' || substr(p_lote_id::text, 1, 8),
    'postura',
    'Programa progressivo gerado automaticamente em ' || to_char(now(), 'DD/MM/YYYY'),
    false,
    true
  ) RETURNING id INTO v_programa_id;

  -- Gera faixas semanais progressivas
  v_dia := v_idade_dias;
  v_horas := v_cfg.horas_inicio;
  v_ganho_h := v_cfg.ganho_semanal_min::numeric / 60.0;

  WHILE v_horas < v_cfg.horas_alvo LOOP
    v_dia_fim := v_dia + 6;
    -- Ajusta acender/apagar centrado em 12h
    v_acender := lpad(floor(12 - v_horas/2)::text, 2, '0') || ':' || lpad(((12 - v_horas/2 - floor(12 - v_horas/2))*60)::int::text, 2, '0');
    v_apagar  := lpad(floor(12 + v_horas/2)::text, 2, '0') || ':' || lpad(((12 + v_horas/2 - floor(12 + v_horas/2))*60)::int::text, 2, '0');
    v_blocos := jsonb_build_array(jsonb_build_object('acender', v_acender, 'apagar', v_apagar, 'intensidade_pct', v_cfg.intensidade_pct));
    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct)
    VALUES (v_programa_id, v_dia, v_dia_fim, v_horas, v_blocos, 20, 20, v_cfg.intensidade_pct);
    v_dia := v_dia_fim + 1;
    v_horas := LEAST(v_cfg.horas_alvo, v_horas + v_ganho_h);
  END LOOP;

  -- Faixa final estável até dia 700
  v_acender := lpad(floor(12 - v_cfg.horas_alvo/2)::text, 2, '0') || ':00';
  v_apagar  := lpad(floor(12 + v_cfg.horas_alvo/2)::text, 2, '0') || ':00';
  v_blocos := jsonb_build_array(jsonb_build_object('acender', v_acender, 'apagar', v_apagar, 'intensidade_pct', v_cfg.intensidade_pct));
  INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct)
  VALUES (v_programa_id, v_dia, 700, v_cfg.horas_alvo, v_blocos, 20, 20, v_cfg.intensidade_pct);

  -- Vincula programa ao lote
  UPDATE lotes SET programa_iluminacao_id = v_programa_id WHERE id = p_lote_id;
  UPDATE config_estimulo_postura
    SET aplicado_em = now(), programa_gerado_id = v_programa_id
    WHERE lote_id = p_lote_id;

  RETURN v_programa_id;
END;
$$;
