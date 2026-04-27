
-- Função para limpar identidades órfãs (sem usuário correspondente) de um email específico.
-- Usada pelo Edge Function create-user para destravar emails que falham na validação
-- por terem registros antigos em auth.identities sem o auth.users associado.
CREATE OR REPLACE FUNCTION public.cleanup_orphan_identities_for_email(p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM auth.identities i
    WHERE LOWER(COALESCE(i.identity_data->>'email', '')) = LOWER(p_email)
      AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = i.user_id
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$;

-- Permite somente service_role chamar essa função (não expor a usuários autenticados)
REVOKE ALL ON FUNCTION public.cleanup_orphan_identities_for_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphan_identities_for_email(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_orphan_identities_for_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_identities_for_email(text) TO service_role;
