
CREATE OR REPLACE FUNCTION public.initialize_demo_data(p_user_id uuid, p_integrado_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Criar parceiros demo (schema atualizado)
  INSERT INTO public.parceiros (integrado_id, razao_social_nome, tipo_cadastro, cpf_cnpj, email, telefone, ativo)
  VALUES 
    (p_integrado_id, 'Nutrição Animal Ltda', 'fornecedor', '12345678000190', 'contato@nutricaoanimal.com', '(11) 3456-7890', true),
    (p_integrado_id, 'Grãos do Brasil SA', 'fornecedor', '98765432000110', 'vendas@graosbrasil.com', '(11) 9876-5432', true),
    (p_integrado_id, 'Frigorífico Central', 'cliente', '11222333000144', 'compras@frigorifico.com', '(11) 1111-2222', true),
    (p_integrado_id, 'Supermercado Bom Preço', 'cliente', '44555666000177', 'ovos@bompreco.com', '(11) 4444-5555', true);
END;
$function$;
