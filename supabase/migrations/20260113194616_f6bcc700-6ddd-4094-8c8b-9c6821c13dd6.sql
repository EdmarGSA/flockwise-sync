-- Adicionar coluna is_demo na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- Criar função para verificar se é usuário demo
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Criar função para verificar se pode modificar dados (não é demo)
CREATE OR REPLACE FUNCTION public.can_modify_data()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT is_demo_user();
$$;

-- Criar tabela para armazenar dados de demonstração (templates)
CREATE TABLE IF NOT EXISTS public.demo_data_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de templates
ALTER TABLE public.demo_data_templates ENABLE ROW LEVEL SECURITY;

-- Policy para leitura de templates (apenas sistema)
CREATE POLICY "Templates são lidos apenas pelo sistema"
ON public.demo_data_templates
FOR SELECT
USING (false);

-- Função para inicializar dados demo para um usuário
CREATE OR REPLACE FUNCTION public.initialize_demo_data(p_user_id uuid, p_integrado_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar configuração de silo
  INSERT INTO public.config_silo (integrado_id, dias_ok, dias_atencao, dias_critico, dias_estoque_sugerido)
  VALUES (p_integrado_id, 5, 3, 1, 7)
  ON CONFLICT (integrado_id) DO NOTHING;

  -- Criar configuração de fechamento
  INSERT INTO public.config_fechamento (integrado_id, constante_ajuste_ca)
  VALUES (p_integrado_id, 0.05)
  ON CONFLICT DO NOTHING;

  -- Criar mortalidade média padrão
  INSERT INTO public.mortalidade_media (
    integrado_id, linhagem, sexo,
    mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias,
    mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias,
    mortalidade_acima_42_dias
  ) VALUES (
    p_integrado_id, 'cobb_500', 'misto',
    0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8
  ) ON CONFLICT DO NOTHING;

  -- Criar áreas demo
  INSERT INTO public.areas (integrado_id, nome, descricao, cor, ativo)
  VALUES 
    (p_integrado_id, 'Fazenda Norte', 'Unidade principal de produção', '#22c55e', true),
    (p_integrado_id, 'Fazenda Sul', 'Unidade secundária', '#3b82f6', true),
    (p_integrado_id, 'Fazenda Oeste', 'Unidade de postura', '#f59e0b', true);

  -- Criar grupos de produto demo
  INSERT INTO public.grupos_produto (integrado_id, nome, descricao, ativo)
  VALUES 
    (p_integrado_id, 'Ração', 'Rações para aves', true),
    (p_integrado_id, 'Medicamentos', 'Medicamentos veterinários', true),
    (p_integrado_id, 'Insumos', 'Insumos para fabricação de ração', true);

  -- Criar categorias demo
  INSERT INTO public.categorias (integrado_id, nome, descricao, ativo)
  VALUES 
    (p_integrado_id, 'Inicial', 'Ração para fase inicial', true),
    (p_integrado_id, 'Crescimento', 'Ração para fase de crescimento', true),
    (p_integrado_id, 'Final', 'Ração para fase final', true),
    (p_integrado_id, 'Antibióticos', 'Medicamentos antibióticos', true);

  -- Criar parceiros demo
  INSERT INTO public.parceiros (integrado_id, nome, tipo, documento, email, telefone, ativo)
  VALUES 
    (p_integrado_id, 'Nutrição Animal Ltda', 'fornecedor', '12.345.678/0001-90', 'contato@nutricaoanimal.com', '(11) 3456-7890', true),
    (p_integrado_id, 'Grãos do Brasil SA', 'fornecedor', '98.765.432/0001-10', 'vendas@graosbrasil.com', '(11) 9876-5432', true),
    (p_integrado_id, 'Frigorífico Central', 'cliente', '11.222.333/0001-44', 'compras@frigorifico.com', '(11) 1111-2222', true),
    (p_integrado_id, 'Supermercado Bom Preço', 'cliente', '44.555.666/0001-77', 'ovos@bompreco.com', '(11) 4444-5555', true);
END;
$$;

-- Função para criar núcleos, silos, galpões e lotes demo (precisa das áreas primeiro)
CREATE OR REPLACE FUNCTION public.initialize_demo_lotes(p_integrado_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Criar lotes demo
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a1, v_galpao_1, 25000, (CURRENT_DATE - INTERVAL '28 days')::date, (CURRENT_DATE - INTERVAL '28 days')::date, 'em_producao', 'cobb_500', 'misto', 0.042)
  RETURNING id INTO v_lote_28d;
  
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a1, v_galpao_2, 24000, (CURRENT_DATE - INTERVAL '14 days')::date, (CURRENT_DATE - INTERVAL '14 days')::date, 'em_producao', 'ross_308', 'misto', 0.044)
  RETURNING id INTO v_lote_14d;
  
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, data_alojamento, status, linhagem, sexo, peso_medio_pintinhos)
  VALUES (p_integrado_id, v_nucleo_a2, v_galpao_3, 30000, (CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE - INTERVAL '7 days')::date, 'em_producao', 'cobb_500', 'macho', 0.043)
  RETURNING id INTO v_lote_7d;
  
  -- Lote agendado
  INSERT INTO public.lotes (integrado_id, nucleo_id, galpao_id, quantidade_aves, data_prevista_alojamento, status, linhagem, sexo)
  VALUES (p_integrado_id, v_nucleo_b1, v_galpao_4, 20000, (CURRENT_DATE + INTERVAL '5 days')::date, 'agendado', 'hubbard', 'femea');

  -- Criar metas de peso
  INSERT INTO public.metas_peso (integrado_id, lote_id, peso_inicial_kg, meta_7_dias_kg, meta_14_dias_kg, meta_21_dias_kg, meta_28_dias_kg, meta_35_dias_kg, meta_42_dias_kg, gpd_kg)
  VALUES 
    (p_integrado_id, v_lote_28d, 0.042, 0.195, 0.520, 0.980, 1.550, 2.200, 2.900, 0.068),
    (p_integrado_id, v_lote_14d, 0.044, 0.200, 0.530, 1.000, 1.580, 2.250, 2.950, 0.069),
    (p_integrado_id, v_lote_7d, 0.043, 0.198, 0.525, 0.990, 1.560, 2.220, 2.920, 0.068);

  -- Criar pesagens demo
  INSERT INTO public.pesagens (integrado_id, lote_id, data_pesagem, peso_medio_kg, quantidade_pesada)
  VALUES 
    (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '21 days', 0.985, 50),
    (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '14 days', 1.520, 50),
    (p_integrado_id, v_lote_28d, CURRENT_DATE - INTERVAL '7 days', 2.180, 50),
    (p_integrado_id, v_lote_14d, CURRENT_DATE - INTERVAL '7 days', 0.510, 50);

  -- Buscar grupo de ração e categorias
  SELECT id INTO v_grupo_racao FROM grupos_produto WHERE integrado_id = p_integrado_id AND nome = 'Ração' LIMIT 1;
  SELECT id INTO v_cat_inicial FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Inicial' LIMIT 1;
  SELECT id INTO v_cat_crescimento FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Crescimento' LIMIT 1;
  SELECT id INTO v_cat_final FROM categorias WHERE integrado_id = p_integrado_id AND nome = 'Final' LIMIT 1;

  -- Criar produtos demo
  INSERT INTO public.produtos (integrado_id, nome, grupo_id, categoria_id, unidade, preco_unitario, estoque_atual, estoque_minimo, ativo)
  VALUES 
    (p_integrado_id, 'Ração Inicial Premium', v_grupo_racao, v_cat_inicial, 'kg', 2.50, 5000, 1000, true),
    (p_integrado_id, 'Ração Crescimento Plus', v_grupo_racao, v_cat_crescimento, 'kg', 2.30, 8000, 2000, true),
    (p_integrado_id, 'Ração Final Engorda', v_grupo_racao, v_cat_final, 'kg', 2.10, 12000, 3000, true);
END;
$$;