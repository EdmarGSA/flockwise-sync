
-- 1. Backfill: garantir admin para todos os donos de org
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.id = p.integrado_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'admin'::app_role
  );

-- 2. Trigger defensivo: sempre que profile.id = integrado_id, garante admin
CREATE OR REPLACE FUNCTION public.ensure_owner_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id = NEW.integrado_id THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_owner_is_admin ON public.profiles;
CREATE TRIGGER trg_ensure_owner_is_admin
AFTER INSERT OR UPDATE OF integrado_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_owner_is_admin();

-- 3. RPC que o front pode chamar para auto-corrigir
CREATE OR REPLACE FUNCTION public.ensure_my_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_owner boolean;
  v_inserted boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT (id = integrado_id) INTO v_is_owner
  FROM public.profiles WHERE id = v_uid;

  IF NOT COALESCE(v_is_owner, false) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'::app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    v_inserted := true;
    PERFORM public.log_secdef_call('ensure_my_admin_role', v_uid::text, NULL);
  END IF;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_admin_role() TO authenticated;

-- 4. Robustecer handle_new_user: seeds não devem derrubar atribuição do admin
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
    -- Atribuição crítica do admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Seeds opcionais: não podem derrubar o signup
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
$$;
