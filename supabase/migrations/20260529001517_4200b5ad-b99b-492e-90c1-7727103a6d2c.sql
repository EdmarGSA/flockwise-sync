
-- 1. Tabela de solicitações de cadastro
CREATE TABLE public.solicitacoes_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  telefone text,
  nome_organizacao text NOT NULL,
  cidade text,
  estado text,
  tipo_producao text CHECK (tipo_producao IN ('corte','postura','ambos')),
  mensagem text,
  origem text NOT NULL DEFAULT 'public_signup' CHECK (origem IN ('public_signup','google_oauth')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','aprovada','reprovada','cancelada')),
  motivo_reprovacao text,
  revisado_por uuid,
  revisado_em timestamptz,
  user_id_criado uuid,
  integrado_id_criado uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice único parcial: só uma solicitação ativa por email (case-insensitive)
CREATE UNIQUE INDEX idx_solicitacoes_email_ativo
  ON public.solicitacoes_cadastro (lower(email))
  WHERE status IN ('pendente','processando');

CREATE INDEX idx_solicitacoes_status_created ON public.solicitacoes_cadastro (status, created_at DESC);
CREATE INDEX idx_solicitacoes_email_lower ON public.solicitacoes_cadastro (lower(email));

-- 2. GRANTs (antes de RLS)
GRANT INSERT ON public.solicitacoes_cadastro TO anon;
GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_cadastro TO authenticated;
GRANT ALL ON public.solicitacoes_cadastro TO service_role;

-- 3. RLS
ALTER TABLE public.solicitacoes_cadastro ENABLE ROW LEVEL SECURITY;

-- INSERT público (anon e authenticated): só status pendente e origem public_signup
CREATE POLICY "Qualquer um pode criar solicitação pública"
  ON public.solicitacoes_cadastro
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pendente'
    AND origem = 'public_signup'
    AND length(trim(full_name)) > 0
    AND length(trim(email)) > 0
    AND length(trim(nome_organizacao)) > 0
  );

-- SELECT: apenas superadmin
CREATE POLICY "Superadmin lê todas solicitações"
  ON public.solicitacoes_cadastro
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

-- UPDATE: apenas superadmin (lock otimista feito pelo WHERE no backend)
CREATE POLICY "Superadmin atualiza solicitações"
  ON public.solicitacoes_cadastro
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 4. Trigger updated_at
CREATE TRIGGER set_solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes_cadastro
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Reforço em handle_new_user: bloqueia signup direto pela anon key
-- Mantém branch created_by_admin (membros internos) intacto.
-- Novo branch "owner" exige signup_source='approved_request' (vindo de inviteUserByEmail aprovado).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_integrado_id uuid;
  claimed_integrado uuid;
  v_signup_source text;
  v_created_by_admin boolean;
BEGIN
  claimed_integrado := NULLIF(new.raw_user_meta_data ->> 'integrado_id','')::uuid;
  v_signup_source := new.raw_user_meta_data ->> 'signup_source';
  v_created_by_admin := COALESCE((new.raw_user_meta_data ->> 'created_by_admin')::boolean, false);

  IF claimed_integrado IS NOT NULL AND v_created_by_admin THEN
    -- Caminho: membro criado por admin da org (edge function create-user)
    target_integrado_id := claimed_integrado;
  ELSIF v_signup_source = 'approved_request' THEN
    -- Caminho: dono de org criado via aprovação no backoffice (inviteUserByEmail)
    target_integrado_id := new.id;
  ELSE
    -- Bloqueia signup direto pela anon key (sem aprovação)
    RAISE EXCEPTION 'signup_nao_autorizado'
      USING HINT = 'Novos cadastros exigem aprovação no BackOffice. Solicite acesso em /auth.';
  END IF;

  INSERT INTO public.profiles (id, full_name, integrado_id)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', target_integrado_id);

  IF target_integrado_id = new.id THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    BEGIN
      INSERT INTO public.mortalidade_media (
        integrado_id, linhagem, sexo,
        mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias,
        mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias,
        mortalidade_acima_42_dias
      ) VALUES (
        new.id, 'cobb_500', 'misto',
        0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: mortalidade_media seed failed: %', SQLERRM;
    END;

    BEGIN
      PERFORM public.seed_programas_iluminacao_default(new.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: seed_programas_iluminacao_default failed: %', SQLERRM;
    END;

    BEGIN
      PERFORM public.seed_organizacao_padrao(new.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: seed_organizacao_padrao failed: %', SQLERRM;
    END;
  END IF;

  RETURN new;
END;
$function$;
