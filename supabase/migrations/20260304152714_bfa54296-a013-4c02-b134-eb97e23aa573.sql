
CREATE OR REPLACE FUNCTION public.initialize_demo_lotes(p_integrado_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_area_norte uuid;
  v_area_sul uuid;
  v_area_oeste uuid;
  v_nucleo_a1 uuid;
  v_nucleo_a2 uuid;
  v_nucleo_b1 uuid;
  v_nucleo_c1 uuid;
  v_silo_01 uuid;
  v_silo_02 uuid;
  v_silo_03 uuid;
  v_silo_04 uuid;
  v_galpao_1 uuid;
  v_galpao_2 uuid;
  v_galpao_3 uuid;
  v_galpao_4 uuid;
  v_galpao_postura uuid;
  v_lote_28d uuid;
  v_lote_14d uuid;
  v_lote_7d uuid;
  v_grupo_racao uuid;
  v_cat_inicial uuid;
  v_cat_crescimento uuid;
  v_cat_final uuid;
BEGIN
  -- Buscar áreas criadas
  SELECT id INTO v_area_norte FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Norte' LIMIT 1;
  SELECT id INTO v_area_sul FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Sul' LIMIT 1;
  SELECT id INTO v_area_oeste FROM areas WHERE integrado_id = p_integrado_id AND nome = 'Fazenda Oeste' LIMIT 1;

  -- Criar silos
  INSERT INTO public.silos (integrado_id, nome, capacidade_kg, kg_por_anel, nivel_atual_aneis, nivel_atual_funil, ativo)
  VALUES (p_integrado_id, 'Silo 01', 15000, 500, 20, 50, true) RETURNING id INTO v_silo_01;
  
  INSERT INTO public.silos (integrado_id, nome, capacidade_kg, kg_por_anel, nivel_atual_aneis, nivel_atual_funil, ativo)
  VALUES (p_integrado_id, 'Silo 02', 15000, 500, 15, 40, true) RETURNING id INTO v_silo_02;
  
  INSERT INTO public.silos (integrado_id, nome, capacidade_kg, kg_por_anel, nivel_atual_aneis, nivel_atual_funil, ativo)
  VALUES (p_integrado_id, 'Silo 03', 20000, 600, 25, 60, true) RETURNING id INTO v_silo_03;
  
  INSERT INTO public.silos (integrado_id, nome, capacidade_kg, kg_por_anel, nivel_atual_aneis, nivel_atual_funil, ativo)
  VALUES (p_integrado_id, 'Silo 04', 10000, 400, 10, 30, true) RETURNING id INTO v_silo_04;

  -- Criar núcleos
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo, responsavel, ativo)
  VALUES (p_integrado_id, v_area_norte, 'Núcleo A1', 'frango_corte', 'João Silva', true) RETURNING id INTO v_nucleo_a1;
  
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo, responsavel, ativo)
  VALUES (p_integrado_id, v_area_norte, 'Núcleo A2', 'frango_corte', 'Maria Santos', true) RETURNING id INTO v_nucleo_a2;
  
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo, responsavel, ativo)
  VALUES (p_integrado_id, v_area_sul, 'Núcleo B1', 'frango_corte', 'Pedro Oliveira', true) RETURNING id INTO v_nucleo_b1;
  
  INSERT INTO public.nucleos (integrado_id, area_id, nome, tipo, responsavel, ativo)
  VALUES (p_integrado_id, v_area_oeste, 'Núcleo C1', 'postura', 'Ana Costa', true) RETURNING id INTO v_nucleo_c1;

  -- Criar galpões
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo)
  VALUES (v_nucleo_a1, v_silo_01, 'Galpão 1', 150, 14, 3, 'nipple', 800, 'automatico', 160, 'positiva', 24, 4, 2, true) RETURNING id INTO v_galpao_1;
  
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo)
  VALUES (v_nucleo_a1, v_silo_02, 'Galpão 2', 150, 14, 3, 'nipple', 800, 'automatico', 160, 'positiva', 24, 4, 2, true) RETURNING id INTO v_galpao_2;
  
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo)
  VALUES (v_nucleo_a2, v_silo_03, 'Galpão 3', 180, 16, 3.5, 'nipple', 1000, 'automatico', 200, 'negativa', 32, 6, 3, true) RETURNING id INTO v_galpao_3;
  
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo)
  VALUES (v_nucleo_b1, v_silo_04, 'Galpão 4', 120, 12, 2.8, 'nipple', 600, 'tubular', 120, 'positiva', 16, 3, 1, true) RETURNING id INTO v_galpao_4;
  
  INSERT INTO public.galpoes (nucleo_id, silo_id, nome, comprimento, largura, altura, bebedouro_tipo, bebedouro_quantidade, comedouro_tipo, comedouro_quantidade, tipo_pressao, ventilador_quantidade, caixa_agua_quantidade, silo_quantidade, ativo)
  VALUES (v_nucleo_c1, null, 'Galpão Postura 1', 100, 10, 3, 'nipple', 500, 'automatico', 100, 'positiva', 12, 2, 1, true) RETURNING id INTO v_galpao_postura;

  -- Criar lotes demo (usando status válidos do enum: previsao, alojado)
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a1, v_galpao_1, 25000, (CURRENT_DATE - INTERVAL '28 days')::date, (CURRENT_DATE - INTERVAL '28 days')::date, (CURRENT_DATE + INTERVAL '14 days')::date, 'alojado', 'cobb_500', 'misto', 0.042)
  RETURNING id INTO v_lote_28d;
  
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a1, v_galpao_2, 24000, (CURRENT_DATE - INTERVAL '14 days')::date, (CURRENT_DATE - INTERVAL '14 days')::date, (CURRENT_DATE + INTERVAL '28 days')::date, 'alojado', 'ross_308', 'misto', 0.044)
  RETURNING id INTO v_lote_14d;
  
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, data_prevista_saida, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a2, v_galpao_3, 30000, (CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE + INTERVAL '35 days')::date, 'alojado', 'cobb_500', 'macho', 0.043)
  RETURNING id INTO v_lote_7d;
  
  -- Lote previsão (agendado para 5 dias)
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, status, linhagem, sexo)
  VALUES (p_integrado_id, v_nucleo_b1, v_galpao_4, 20000, (CURRENT_DATE + INTERVAL '5 days')::date, 'previsao', 'hubbard', 'femea');

  -- Criar metas de peso
  INSERT INTO public.metas_peso (integrado_id, lote_id, peso_inicial_kg, meta_7_dias_kg, meta_14_dias_kg, meta_21_dias_kg, meta_28_dias_kg, meta_35_dias_kg, meta_42_dias_kg, gpd_kg)
  VALUES 
    (p_integrado_id, v_lote_28d, 0.042, 0.195, 0.520, 0.980, 1.550, 2.200, 2.900, 0.068),
    (p_integrado_id, v_lote_14d, 0.044, 0.200, 0.530, 1.000, 1.580, 2.250, 2.950, 0.069),
    (p_integrado_id, v_lote_7d, 0.043, 0.198, 0.525, 0.990, 1.560, 2.220, 2.920, 0.068);

  -- Criar pesagens demo com pesagem_itens
  DECLARE
    v_pesagem_id uuid;
  BEGIN
    -- Lote 28d: pesagem aos 7 dias
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada)
    VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '21 days', 0.195, 50)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 4.875), (v_pesagem_id, 2, 25, 4.875);

    -- Lote 28d: pesagem aos 14 dias
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada)
    VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '14 days', 0.520, 50)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 13.0), (v_pesagem_id, 2, 25, 13.0);

    -- Lote 28d: pesagem aos 21 dias
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada)
    VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '7 days', 0.980, 50)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 24.5), (v_pesagem_id, 2, 25, 24.5);

    -- Lote 28d: pesagem aos 28 dias (hoje)
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada, consumo_real_kg, conversao_alimentar)
    VALUES (p_integrado_id, v_lote_28d, CURRENT_DATE, 1.550, 50, 57500, 1.48)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 38.75), (v_pesagem_id, 2, 25, 38.75);

    -- Lote 14d: pesagem aos 7 dias
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada)
    VALUES (p_integrado_id, v_lote_14d, CURRENT_DATE - INTERVAL '7 days', 0.200, 50)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 5.0), (v_pesagem_id, 2, 25, 5.0);

    -- Lote 14d: pesagem aos 14 dias (hoje)
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada, consumo_real_kg, conversao_alimentar)
    VALUES (p_integrado_id, v_lote_14d, CURRENT_DATE, 0.530, 50, 17280, 1.36)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 13.25), (v_pesagem_id, 2, 25, 13.25);

    -- Lote 7d: pesagem aos 7 dias (hoje)
    INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada, consumo_real_kg, conversao_alimentar)
    VALUES (p_integrado_id, v_lote_7d, CURRENT_DATE, 0.198, 50, 4500, 0.76)
    RETURNING id INTO v_pesagem_id;
    INSERT INTO public.pesagem_itens (pesagem_id, numero_caixa, quantidade_aves, peso_liquido_g)
    VALUES (v_pesagem_id, 1, 25, 4.95), (v_pesagem_id, 2, 25, 4.95);
  END;

  -- Criar mortalidade demo
  DECLARE
    v_mort_id uuid;
  BEGIN
    -- Lote 28d: mortalidade semanas 1-4
    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_28d, CURRENT_DATE - INTERVAL '25 days', 'diaria', 'Mortalidade semana 1') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 45), (v_mort_id, 'refugo', 15);

    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_28d, CURRENT_DATE - INTERVAL '18 days', 'diaria', 'Mortalidade semana 2') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 30), (v_mort_id, 'refugo', 10);

    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_28d, CURRENT_DATE - INTERVAL '11 days', 'diaria', 'Mortalidade semana 3') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 25), (v_mort_id, 'refugo', 8);

    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_28d, CURRENT_DATE - INTERVAL '4 days', 'diaria', 'Mortalidade semana 4') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 20), (v_mort_id, 'refugo', 5);

    -- Lote 14d: mortalidade semanas 1-2
    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_14d, CURRENT_DATE - INTERVAL '11 days', 'diaria', 'Mortalidade semana 1') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 40), (v_mort_id, 'refugo', 12);

    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_14d, CURRENT_DATE - INTERVAL '4 days', 'diaria', 'Mortalidade semana 2') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 28), (v_mort_id, 'refugo', 8);

    -- Lote 7d: mortalidade semana 1
    INSERT INTO public.mortalidade (lote_id, data_registro, tipo, observacoes)
    VALUES (v_lote_7d, CURRENT_DATE - INTERVAL '4 days', 'diaria', 'Mortalidade semana 1') RETURNING id INTO v_mort_id;
    INSERT INTO public.mortalidade_itens (mortalidade_id, causa, quantidade) VALUES (v_mort_id, 'natural', 50), (v_mort_id, 'refugo', 18);
  END;

  -- Criar produtos demo (schema atualizado)
  SELECT id INTO v_grupo_racao FROM grupos_produto WHERE integrado_id = p_integrado_id AND nome = 'Ração' LIMIT 1;
  SELECT id INTO v_cat_inicial FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Inicial' LIMIT 1;
  SELECT id INTO v_cat_crescimento FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Crescimento' LIMIT 1;
  SELECT id INTO v_cat_final FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Final' LIMIT 1;

  INSERT INTO public.produtos (integrado_id, nome, grupo_produto_id, categoria_id, unidade_medida, custo_unitario, estoque_atual, estoque_minimo, ativo)
  VALUES 
    (p_integrado_id, 'Ração Inicial Premium', v_grupo_racao, v_cat_inicial, 'kg', 2.50, 5000, 1000, true),
    (p_integrado_id, 'Ração Crescimento Plus', v_grupo_racao, v_cat_crescimento, 'kg', 2.30, 8000, 2000, true),
    (p_integrado_id, 'Ração Final Engorda', v_grupo_racao, v_cat_final, 'kg', 2.10, 12000, 3000, true);

  -- Criar metas zootécnicas demo
  INSERT INTO public.metas_zootecnicas (
    integrado_id,
    mortalidade_7_dias_ok, mortalidade_7_dias_alerta,
    mortalidade_14_dias_ok, mortalidade_14_dias_alerta,
    mortalidade_21_dias_ok, mortalidade_21_dias_alerta,
    mortalidade_28_dias_ok, mortalidade_28_dias_alerta,
    mortalidade_35_dias_ok, mortalidade_35_dias_alerta,
    mortalidade_42_dias_ok, mortalidade_42_dias_alerta,
    ca_7_dias_ok, ca_7_dias_alerta,
    ca_14_dias_ok, ca_14_dias_alerta,
    ca_21_dias_ok, ca_21_dias_alerta,
    ca_28_dias_ok, ca_28_dias_alerta,
    ca_35_dias_ok, ca_35_dias_alerta,
    ca_42_dias_ok, ca_42_dias_alerta
  ) VALUES (
    p_integrado_id,
    0.50, 1.00,
    0.80, 1.50,
    1.20, 2.00,
    1.50, 2.50,
    2.00, 3.00,
    2.50, 3.50,
    0.90, 1.10,
    1.20, 1.40,
    1.35, 1.55,
    1.48, 1.68,
    1.60, 1.80,
    1.70, 1.90
  ) ON CONFLICT DO NOTHING;
END;
$function$;
