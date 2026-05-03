
CREATE OR REPLACE FUNCTION public.auto_aplicar_estimulos_postura()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg RECORD;
  v_lote RECORD;
  v_idade_dias integer;
  v_idade_sem integer;
  v_peso_kg numeric;
  v_aplicados integer := 0;
BEGIN
  FOR v_cfg IN
    SELECT c.* FROM config_estimulo_postura c
    WHERE c.auto_aplicar = true AND c.aplicado_em IS NULL
  LOOP
    SELECT * INTO v_lote FROM lotes WHERE id = v_cfg.lote_id;
    IF v_lote.id IS NULL OR v_lote.data_alojamento IS NULL OR v_lote.status <> 'alojado' THEN
      CONTINUE;
    END IF;

    v_idade_dias := (CURRENT_DATE - v_lote.data_alojamento)::integer + 1;
    v_idade_sem := v_idade_dias / 7;
    IF v_idade_sem < v_cfg.idade_min_semanas THEN CONTINUE; END IF;

    -- Última pesagem média (kg) do lote
    SELECT AVG((pi.peso_bruto_g - pi.peso_tara_g) / NULLIF(pi.quantidade_aves,0))
      INTO v_peso_kg
    FROM pesagens p
    JOIN pesagem_itens pi ON pi.pesagem_id = p.id
    WHERE p.lote_id = v_lote.id
      AND p.data_pesagem >= CURRENT_DATE - INTERVAL '14 days';

    IF v_peso_kg IS NULL OR v_peso_kg < v_cfg.peso_min_kg THEN CONTINUE; END IF;

    -- Aplica via função (SET LOCAL para passar pelo check de organização)
    PERFORM aplicar_estimulo_postura_internal(v_cfg.lote_id);
    v_aplicados := v_aplicados + 1;
  END LOOP;

  RETURN v_aplicados;
END;
$$;

-- Versão "internal" sem checagem de get_my_integrado_id (job sem usuário)
CREATE OR REPLACE FUNCTION public.aplicar_estimulo_postura_internal(p_lote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote RECORD;
  v_cfg RECORD;
  v_idade_dias integer;
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
  IF NOT FOUND OR v_lote.data_alojamento IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_cfg FROM config_estimulo_postura WHERE lote_id = p_lote_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_idade_dias := GREATEST(1, (CURRENT_DATE - v_lote.data_alojamento)::integer + 1);

  INSERT INTO programa_iluminacao_lote (integrado_id, nome, tipo_producao, descricao, is_default, ativo)
  VALUES (v_lote.integrado_id, 'Estímulo Postura - Lote ' || substr(p_lote_id::text,1,8),
          'postura', 'Auto-gerado em ' || to_char(now(), 'DD/MM/YYYY'), false, true)
  RETURNING id INTO v_programa_id;

  v_dia := v_idade_dias;
  v_horas := v_cfg.horas_inicio;
  v_ganho_h := v_cfg.ganho_semanal_min::numeric / 60.0;

  WHILE v_horas < v_cfg.horas_alvo LOOP
    v_dia_fim := v_dia + 6;
    v_acender := lpad(floor(12 - v_horas/2)::text, 2, '0') || ':' || lpad(((12 - v_horas/2 - floor(12 - v_horas/2))*60)::int::text, 2, '0');
    v_apagar  := lpad(floor(12 + v_horas/2)::text, 2, '0') || ':' || lpad(((12 + v_horas/2 - floor(12 + v_horas/2))*60)::int::text, 2, '0');
    v_blocos := jsonb_build_array(jsonb_build_object('acender', v_acender, 'apagar', v_apagar, 'intensidade_pct', v_cfg.intensidade_pct));
    INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct)
    VALUES (v_programa_id, v_dia, v_dia_fim, v_horas, v_blocos, 20, 20, v_cfg.intensidade_pct);
    v_dia := v_dia_fim + 1;
    v_horas := LEAST(v_cfg.horas_alvo, v_horas + v_ganho_h);
  END LOOP;

  v_acender := lpad(floor(12 - v_cfg.horas_alvo/2)::text, 2, '0') || ':00';
  v_apagar  := lpad(floor(12 + v_cfg.horas_alvo/2)::text, 2, '0') || ':00';
  v_blocos := jsonb_build_array(jsonb_build_object('acender', v_acender, 'apagar', v_apagar, 'intensidade_pct', v_cfg.intensidade_pct));
  INSERT INTO programa_iluminacao_faixa (programa_id, dia_inicio, dia_fim, horas_luz, blocos, ramp_up_min, ramp_down_min, intensidade_pct)
  VALUES (v_programa_id, v_dia, 700, v_cfg.horas_alvo, v_blocos, 20, 20, v_cfg.intensidade_pct);

  UPDATE lotes SET programa_iluminacao_id = v_programa_id WHERE id = p_lote_id;
  UPDATE config_estimulo_postura
    SET aplicado_em = now(), programa_gerado_id = v_programa_id
    WHERE lote_id = p_lote_id;

  RETURN v_programa_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_aplicar_estimulos_postura() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aplicar_estimulo_postura_internal(uuid) FROM PUBLIC, anon, authenticated;
