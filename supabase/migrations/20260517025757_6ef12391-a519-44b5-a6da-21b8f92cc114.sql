
BEGIN;

-- pesagem_itens: peso_liquido_g é GENERATED; drop primeiro
ALTER TABLE public.pesagem_itens DROP COLUMN peso_liquido_g;
ALTER TABLE public.pesagem_itens
  ADD COLUMN peso_bruto_kg numeric,
  ADD COLUMN peso_tara_kg numeric;
UPDATE public.pesagem_itens SET
  peso_bruto_kg = ROUND((peso_bruto_g / 1000.0)::numeric, 6),
  peso_tara_kg = ROUND((peso_tara_g / 1000.0)::numeric, 6);
ALTER TABLE public.pesagem_itens
  DROP COLUMN peso_bruto_g,
  DROP COLUMN peso_tara_g;
ALTER TABLE public.pesagem_itens
  ADD COLUMN peso_liquido_kg numeric GENERATED ALWAYS AS (peso_bruto_kg - peso_tara_kg) STORED;

-- desempenho_aves
ALTER TABLE public.desempenho_aves
  ADD COLUMN peso_kg numeric,
  ADD COLUMN ganho_diario_kg numeric,
  ADD COLUMN ganho_medio_diario_kg numeric,
  ADD COLUMN consumo_diario_racao_kg numeric,
  ADD COLUMN consumo_acumulado_racao_kg numeric;
UPDATE public.desempenho_aves SET
  peso_kg = ROUND((peso_g / 1000.0)::numeric, 4),
  ganho_diario_kg = ROUND((ganho_diario_g / 1000.0)::numeric, 4),
  ganho_medio_diario_kg = ROUND((ganho_medio_diario_g / 1000.0)::numeric, 4),
  consumo_diario_racao_kg = ROUND((consumo_diario_racao_g / 1000.0)::numeric, 4),
  consumo_acumulado_racao_kg = ROUND((consumo_acumulado_racao_g / 1000.0)::numeric, 4);
ALTER TABLE public.desempenho_aves
  DROP COLUMN peso_g,
  DROP COLUMN ganho_diario_g,
  DROP COLUMN ganho_medio_diario_g,
  DROP COLUMN consumo_diario_racao_g,
  DROP COLUMN consumo_acumulado_racao_g;

-- desempenho_postura
ALTER TABLE public.desempenho_postura
  ADD COLUMN peso_kg numeric,
  ADD COLUMN consumo_diario_kg numeric;
UPDATE public.desempenho_postura SET
  peso_kg = ROUND((peso_g / 1000.0)::numeric, 4),
  consumo_diario_kg = ROUND((consumo_diario_g / 1000.0)::numeric, 4);
ALTER TABLE public.desempenho_postura
  DROP COLUMN peso_g,
  DROP COLUMN consumo_diario_g;

ALTER TABLE public.lotes RENAME COLUMN peso_medio_pintinhos TO peso_medio_pintinhos_kg;
ALTER TABLE public.produtos_animais RENAME COLUMN peso_medio_referencia TO peso_medio_referencia_kg;

-- Atualiza funções dependentes
CREATE OR REPLACE FUNCTION public.aplicar_estimulo_postura_internal(p_lote_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_lote RECORD; v_cfg RECORD; v_idade_dias integer; v_horas numeric;
  v_dia integer; v_dia_fim integer; v_ganho_h numeric;
  v_acender text; v_apagar text; v_programa_id uuid; v_blocos jsonb;
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
  v_dia := v_idade_dias; v_horas := v_cfg.horas_inicio;
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
  UPDATE config_estimulo_postura SET aplicado_em = now(), programa_gerado_id = v_programa_id WHERE lote_id = p_lote_id;
  RETURN v_programa_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_aplicar_estimulos_postura()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cfg RECORD; v_lote RECORD; v_idade_dias integer; v_idade_sem integer;
  v_peso_kg numeric; v_aplicados integer := 0;
BEGIN
  FOR v_cfg IN SELECT c.* FROM config_estimulo_postura c WHERE c.auto_aplicar = true AND c.aplicado_em IS NULL LOOP
    SELECT * INTO v_lote FROM lotes WHERE id = v_cfg.lote_id;
    IF v_lote.id IS NULL OR v_lote.data_alojamento IS NULL OR v_lote.status <> 'alojado' THEN CONTINUE; END IF;
    v_idade_dias := (CURRENT_DATE - v_lote.data_alojamento)::integer + 1;
    v_idade_sem := v_idade_dias / 7;
    IF v_idade_sem < v_cfg.idade_min_semanas THEN CONTINUE; END IF;
    SELECT AVG(pi.peso_liquido_kg / NULLIF(pi.quantidade_aves,0)) INTO v_peso_kg
      FROM pesagens p JOIN pesagem_itens pi ON pi.pesagem_id = p.id
      WHERE p.lote_id = v_lote.id AND p.data_pesagem >= CURRENT_DATE - INTERVAL '14 days';
    IF v_peso_kg IS NULL OR v_peso_kg < v_cfg.peso_min_kg THEN CONTINUE; END IF;
    PERFORM aplicar_estimulo_postura_internal(v_cfg.lote_id);
    v_aplicados := v_aplicados + 1;
  END LOOP;
  RETURN v_aplicados;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_benchmark_linhagem(p_linhagem text, p_sexo text DEFAULT NULL::text, p_integrado_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(semana integer, peso_medio_kg numeric, mortalidade_acum_pct numeric, amostra integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_integrado uuid := COALESCE(p_integrado_id, get_my_integrado_id());
  v_lote_ids uuid[]; v_amostra integer;
BEGIN
  PERFORM log_secdef_call('get_benchmark_linhagem', p_linhagem, jsonb_build_object('sexo', p_sexo));
  SELECT array_agg(l.id) INTO v_lote_ids FROM lotes l
  WHERE l.integrado_id = v_integrado AND l.status = 'fechado'
    AND l.quantidade_aves >= 5000
    AND l.data_alojamento >= (CURRENT_DATE - INTERVAL '24 months')
    AND (l.linhagem::text = p_linhagem OR l.linhagem_postura::text = p_linhagem)
    AND (p_sexo IS NULL OR l.sexo::text = p_sexo);
  v_amostra := COALESCE(array_length(v_lote_ids, 1), 0);
  IF v_amostra < 3 THEN RETURN; END IF;
  RETURN QUERY
  WITH pesagens_agg AS (
    SELECT p.lote_id,
      GREATEST(1, FLOOR((p.data_pesagem - l.data_alojamento)::numeric / 7)::integer + 1) AS semana,
      AVG(pi.peso_liquido_kg / NULLIF(pi.quantidade_aves, 0)) AS peso_kg
    FROM pesagens p JOIN lotes l ON l.id = p.lote_id JOIN pesagem_itens pi ON pi.pesagem_id = p.id
    WHERE p.lote_id = ANY(v_lote_ids) AND l.data_alojamento IS NOT NULL
    GROUP BY p.lote_id, semana
  ),
  mort_agg AS (
    SELECT m.lote_id,
      GREATEST(1, FLOOR((m.data_registro - l.data_alojamento)::numeric / 7)::integer + 1) AS semana,
      SUM(mi.quantidade)::numeric / NULLIF(l.quantidade_aves, 0) * 100 AS pct
    FROM mortalidade m JOIN lotes l ON l.id = m.lote_id JOIN mortalidade_itens mi ON mi.mortalidade_id = m.id
    WHERE m.lote_id = ANY(v_lote_ids) AND l.data_alojamento IS NOT NULL
    GROUP BY m.lote_id, semana, l.quantidade_aves
  ),
  semanas AS (
    SELECT DISTINCT s FROM (SELECT semana s FROM pesagens_agg UNION SELECT semana FROM mort_agg) x WHERE s BETWEEN 1 AND 100
  )
  SELECT s.s::integer AS semana,
    ROUND(AVG(pa.peso_kg)::numeric, 3) AS peso_medio_kg,
    ROUND(AVG(SUM(ma.pct)) OVER (ORDER BY s.s)::numeric, 3) AS mortalidade_acum_pct,
    v_amostra AS amostra
  FROM semanas s
  LEFT JOIN pesagens_agg pa ON pa.semana = s.s
  LEFT JOIN mort_agg ma ON ma.semana = s.s
  GROUP BY s.s ORDER BY s.s;
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_demo_lotes(p_integrado_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_area_norte uuid; v_area_sul uuid; v_area_oeste uuid;
  v_nucleo_a1 uuid; v_nucleo_a2 uuid; v_nucleo_b1 uuid; v_nucleo_c1 uuid;
  v_silo_01 uuid; v_silo_02 uuid; v_silo_03 uuid; v_silo_04 uuid;
  v_galpao_1 uuid; v_galpao_2 uuid; v_galpao_3 uuid; v_galpao_4 uuid; v_galpao_postura uuid;
  v_lote_28d uuid; v_lote_14d uuid; v_lote_7d uuid;
  v_grupo_racao uuid; v_cat_inicial uuid; v_cat_crescimento uuid; v_cat_final uuid;
  v_pesagem_id uuid; v_mort_id uuid;
BEGIN
  SELECT id INTO v_area_norte FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Norte' LIMIT 1;
  SELECT id INTO v_area_sul FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Sul' LIMIT 1;
  SELECT id INTO v_area_oeste FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Oeste' LIMIT 1;
  INSERT INTO public.silos (integrado_id, nome, diametro_m, numero_pernas, numero_aneis, capacidade_volume_m3, fator_tonelada_m3, ativo) VALUES (p_integrado_id, 'Silo 01', 3.5, 4, 20, 25, 0.6, true) RETURNING id INTO v_silo_01;
  INSERT INTO public.silos (integrado_id, nome, diametro_m, numero_pernas, numero_aneis, capacidade_volume_m3, fator_tonelada_m3, ativo) VALUES (p_integrado_id, 'Silo 02', 3.5, 4, 20, 25, 0.6, true) RETURNING id INTO v_silo_02;
  INSERT INTO public.silos (integrado_id, nome, diametro_m, numero_pernas, numero_aneis, capacidade_volume_m3, fator_tonelada_m3, ativo) VALUES (p_integrado_id, 'Silo 03', 4.0, 4, 25, 35, 0.6, true) RETURNING id INTO v_silo_03;
  INSERT INTO public.silos (integrado_id, nome, diametro_m, numero_pernas, numero_aneis, capacidade_volume_m3, fator_tonelada_m3, ativo) VALUES (p_integrado_id, 'Silo 04', 3.0, 4, 15, 18, 0.6, true) RETURNING id INTO v_silo_04;
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo_producao, cep, logradouro, bairro, cidade, estado, ativo) VALUES (p_integrado_id, v_area_norte, 'Núcleo A1', 'frango_corte', '85000-000', 'Estrada Rural KM 5', 'Zona Rural', 'Guarapuava', 'PR', true) RETURNING id INTO v_nucleo_a1;
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo_producao, cep, logradouro, bairro, cidade, estado, ativo) VALUES (p_integrado_id, v_area_norte, 'Núcleo A2', 'frango_corte', '85000-001', 'Estrada Rural KM 8', 'Zona Rural', 'Guarapuava', 'PR', true) RETURNING id INTO v_nucleo_a2;
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo_producao, cep, logradouro, bairro, cidade, estado, ativo) VALUES (p_integrado_id, v_area_sul, 'Núcleo B1', 'frango_corte', '85100-000', 'Rod. BR-277 KM 340', 'Distrito Industrial', 'Pinhão', 'PR', true) RETURNING id INTO v_nucleo_b1;
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo_producao, cep, logradouro, bairro, cidade, estado, ativo) VALUES (p_integrado_id, v_area_oeste, 'Núcleo C1', 'postura', '85200-000', 'Linha São José KM 3', 'Interior', 'Candói', 'PR', true) RETURNING id INTO v_nucleo_c1;
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo) VALUES (v_nucleo_a1, v_silo_01, 'Galpão 1', 150, 14, 3, 'niple', 800, 'automatico', 160, 'positiva', 24, 4, 2, true) RETURNING id INTO v_galpao_1;
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo) VALUES (v_nucleo_a1, v_silo_02, 'Galpão 2', 150, 14, 3, 'niple', 800, 'automatico', 160, 'positiva', 24, 4, 2, true) RETURNING id INTO v_galpao_2;
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo) VALUES (v_nucleo_a2, v_silo_03, 'Galpão 3', 180, 16, 3.5, 'niple', 1000, 'automatico', 200, 'negativa', 32, 6, 3, true) RETURNING id INTO v_galpao_3;
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo) VALUES (v_nucleo_b1, v_silo_04, 'Galpão 4', 120, 12, 2.8, 'niple', 600, 'manual', 120, 'positiva', 16, 3, 1, true) RETURNING id INTO v_galpao_4;
  INSERT INTO public.galpoes (nucleo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo) VALUES (v_nucleo_c1, 'Galpão Postura 1', 100, 10, 3, 'niple', 500, 'automatico', 100, 'positiva', 12, 2, 1, true) RETURNING id INTO v_galpao_postura;
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos_kg) VALUES (p_integrado_id, v_nucleo_a1, v_galpao_1, 25000, (CURRENT_DATE-28)::date, (CURRENT_DATE-28)::date, (CURRENT_DATE+14)::date, 'alojado', 'cobb_500', 'misto', 0.042) RETURNING id INTO v_lote_28d;
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos_kg) VALUES (p_integrado_id, v_nucleo_a1, v_galpao_2, 24000, (CURRENT_DATE-14)::date, (CURRENT_DATE-14)::date, (CURRENT_DATE+28)::date, 'alojado', 'ross_308', 'misto', 0.044) RETURNING id INTO v_lote_14d;
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos_kg) VALUES (p_integrado_id, v_nucleo_a2, v_galpao_3, 30000, (CURRENT_DATE-7)::date, (CURRENT_DATE-7)::date, (CURRENT_DATE+35)::date, 'alojado', 'cobb_500', 'macho', 0.043) RETURNING id INTO v_lote_7d;
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, status, linhagem, sexo) VALUES (p_integrado_id, v_nucleo_b1, v_galpao_4, 20000, (CURRENT_DATE+5)::date, 'previsao', 'hubbard', 'femea');
  INSERT INTO public.metas_peso (integrado_id, lote_id, peso_inicial_kg, meta_7_dias_kg, meta_14_dias_kg, meta_21_dias_kg, meta_28_dias_kg, meta_35_dias_kg, meta_42_dias_kg, gpd_kg) VALUES
    (p_integrado_id, v_lote_28d, 0.042, 0.195, 0.520, 0.980, 1.550, 2.200, 2.900, 0.068),
    (p_integrado_id, v_lote_14d, 0.044, 0.200, 0.530, 1.000, 1.580, 2.250, 2.950, 0.069),
    (p_integrado_id, v_lote_7d, 0.043, 0.198, 0.525, 0.990, 1.560, 2.220, 2.920, 0.068);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem) VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE-21) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.005875, 0.0005), (v_pesagem_id, 25, 0.005875, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem) VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE-14) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.014, 0.0005), (v_pesagem_id, 25, 0.014, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem) VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE-7) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.0255, 0.0005), (v_pesagem_id, 25, 0.0255, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, consumo_real_kg, conversao_alimentar) VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE, 57500, 1.48) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.03975, 0.0005), (v_pesagem_id, 25, 0.03975, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem) VALUES (p_integrado_id, v_lote_14d, CURRENT_DATE-7) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.006, 0.0005), (v_pesagem_id, 25, 0.006, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, consumo_real_kg, conversao_alimentar) VALUES (p_integrado_id, v_lote_14d, CURRENT_DATE, 17280, 1.36) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.01425, 0.0005), (v_pesagem_id, 25, 0.01425, 0.0005);
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, consumo_real_kg, conversao_alimentar) VALUES (p_integrado_id, v_lote_7d, CURRENT_DATE, 4500, 0.76) RETURNING id INTO v_pesagem_id;
  INSERT INTO public.pesagem_itens (pesagem_id, quantidade_aves, peso_bruto_kg, peso_tara_kg) VALUES (v_pesagem_id, 25, 0.0055, 0.0005), (v_pesagem_id, 25, 0.0055, 0.0005);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_28d, p_integrado_id, CURRENT_DATE-25) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 45), (v_mort_id, 'eliminado', 15);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_28d, p_integrado_id, CURRENT_DATE-18) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 30), (v_mort_id, 'eliminado', 10);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_28d, p_integrado_id, CURRENT_DATE-11) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 25), (v_mort_id, 'eliminado', 8);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_28d, p_integrado_id, CURRENT_DATE-4) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 20), (v_mort_id, 'eliminado', 5);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_14d, p_integrado_id, CURRENT_DATE-11) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 40), (v_mort_id, 'eliminado', 12);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_14d, p_integrado_id, CURRENT_DATE-4) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 28), (v_mort_id, 'eliminado', 8);
  INSERT INTO public.mortalidade (lote_id, integrado_id, data_registro) VALUES (v_lote_7d, p_integrado_id, CURRENT_DATE-4) RETURNING id INTO v_mort_id;
  INSERT INTO public.mortalidade_itens (mortalidade_id, motivo, quantidade) VALUES (v_mort_id, 'natural', 50), (v_mort_id, 'eliminado', 18);
  SELECT id INTO v_grupo_racao FROM grupos_produto WHERE integrado_id = p_integrado_id AND nome = 'Ração' LIMIT 1;
  SELECT id INTO v_cat_inicial FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Inicial' LIMIT 1;
  SELECT id INTO v_cat_crescimento FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Crescimento' LIMIT 1;
  SELECT id INTO v_cat_final FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Final' LIMIT 1;
  INSERT INTO public.produtos (integrado_id, sku, nome, grupo_produto_id, categoria_id, unidade_medida, custo_unitario, estoque_atual, estoque_minimo, ativo) VALUES
    (p_integrado_id, 'RAC-INI-001', 'Ração Inicial Premium', v_grupo_racao, v_cat_inicial, 'kg', 2.50, 5000, 1000, true),
    (p_integrado_id, 'RAC-CRE-001', 'Ração Crescimento Plus', v_grupo_racao, v_cat_crescimento, 'kg', 2.30, 8000, 2000, true),
    (p_integrado_id, 'RAC-FIN-001', 'Ração Final Engorda', v_grupo_racao, v_cat_final, 'kg', 2.10, 12000, 3000, true);
  INSERT INTO public.metas_zootecnicas (integrado_id, mortalidade_7_dias_ok, mortalidade_7_dias_alerta, mortalidade_14_dias_ok, mortalidade_14_dias_alerta, mortalidade_21_dias_ok, mortalidade_21_dias_alerta, mortalidade_28_dias_ok, mortalidade_28_dias_alerta, mortalidade_35_dias_ok, mortalidade_35_dias_alerta, mortalidade_42_dias_ok, mortalidade_42_dias_alerta, ca_7_dias_ok, ca_7_dias_alerta, ca_14_dias_ok, ca_14_dias_alerta, ca_21_dias_ok, ca_21_dias_alerta, ca_28_dias_ok, ca_28_dias_alerta, ca_35_dias_ok, ca_35_dias_alerta, ca_42_dias_ok, ca_42_dias_alerta) VALUES (p_integrado_id, 0.50, 1.00, 0.80, 1.50, 1.20, 2.00, 1.50, 2.50, 2.00, 3.00, 2.50, 3.50, 0.90, 1.10, 1.20, 1.40, 1.35, 1.55, 1.48, 1.68, 1.60, 1.80, 1.70, 1.90) ON CONFLICT DO NOTHING;
END;
$function$;

COMMIT;
