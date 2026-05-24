
-- 1) Seed mínimo para nova organização
CREATE OR REPLACE FUNCTION public.seed_organizacao_padrao(p_integrado_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_secdef_call('seed_organizacao_padrao', p_integrado_id::text, NULL);

  INSERT INTO public.config_silo (integrado_id, dias_ok, dias_atencao, dias_critico, dias_estoque_sugerido)
  VALUES (p_integrado_id, 5, 3, 1, 7)
  ON CONFLICT (integrado_id) DO NOTHING;

  INSERT INTO public.config_fechamento (integrado_id, constante_ajuste_ca)
  VALUES (p_integrado_id, 0.05)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.grupos_produto (integrado_id, nome, descricao, ativo) VALUES
    (p_integrado_id, 'Ração', 'Rações para aves', true),
    (p_integrado_id, 'Medicamentos', 'Medicamentos veterinários', true),
    (p_integrado_id, 'Insumos', 'Insumos para fabricação de ração', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.categorias (integrado_id, nome, descricao, ativo) VALUES
    (p_integrado_id, 'Inicial', 'Ração para fase inicial', true),
    (p_integrado_id, 'Crescimento', 'Ração para fase de crescimento', true),
    (p_integrado_id, 'Final', 'Ração para fase final', true),
    (p_integrado_id, 'Antibióticos', 'Medicamentos antibióticos', true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 2) Hardening do handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_integrado_id uuid;
  claimed_integrado uuid;
BEGIN
  -- IMPORTANTE: cliente público NÃO pode escolher tenant via metadata.
  -- Só aceitamos integrado_id quando created_by_admin=true vier do service_role
  -- (edge function criar-membro), validado por chave separada.
  claimed_integrado := NULLIF(new.raw_user_meta_data ->> 'integrado_id','')::uuid;

  IF claimed_integrado IS NOT NULL
     AND (new.raw_user_meta_data ->> 'created_by_admin')::boolean IS TRUE
  THEN
    target_integrado_id := claimed_integrado;
  ELSE
    target_integrado_id := new.id;
  END IF;

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
    PERFORM public.seed_organizacao_padrao(new.id);
  END IF;

  RETURN new;
END;
$$;

-- 3) Organizacoes: created_by + unique CNPJ por tenant
ALTER TABLE public.organizacoes
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

CREATE UNIQUE INDEX IF NOT EXISTS organizacoes_integrado_cnpj_uniq
  ON public.organizacoes (integrado_id, cnpj)
  WHERE cnpj IS NOT NULL AND cnpj <> '';
