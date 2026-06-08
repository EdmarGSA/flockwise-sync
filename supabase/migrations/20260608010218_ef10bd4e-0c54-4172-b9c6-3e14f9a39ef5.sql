
-- 1) ewelink_tokens: somente service_role (edge functions). Remove qualquer acesso de usuários autenticados.
DROP POLICY IF EXISTS "Admins can view ewelink tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Admins can insert ewelink tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Admins can update ewelink tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Admins can delete ewelink tokens" ON public.ewelink_tokens;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ewelink_tokens FROM authenticated;
GRANT ALL ON public.ewelink_tokens TO service_role;

-- 2) contas_bancarias: somente admin/integrado da organização.
DROP POLICY IF EXISTS "Users can view contas_bancarias by org" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can insert contas_bancarias for org" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can update contas_bancarias for org" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can delete contas_bancarias for org" ON public.contas_bancarias;

CREATE POLICY "Admins podem ver contas_bancarias"
  ON public.contas_bancarias FOR SELECT TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

CREATE POLICY "Admins podem inserir contas_bancarias"
  ON public.contas_bancarias FOR INSERT TO authenticated
  WITH CHECK (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

CREATE POLICY "Admins podem atualizar contas_bancarias"
  ON public.contas_bancarias FOR UPDATE TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

CREATE POLICY "Admins podem deletar contas_bancarias"
  ON public.contas_bancarias FOR DELETE TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

-- 3) organizacoes: leitura/edição apenas admin/integrado.
DROP POLICY IF EXISTS "Users can view organizacoes by org" ON public.organizacoes;
DROP POLICY IF EXISTS "Users can insert organizacoes for org" ON public.organizacoes;
DROP POLICY IF EXISTS "Users can update organizacoes for org" ON public.organizacoes;

CREATE POLICY "Admins podem ver organizacoes"
  ON public.organizacoes FOR SELECT TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

CREATE POLICY "Admins podem inserir organizacoes"
  ON public.organizacoes FOR INSERT TO authenticated
  WITH CHECK (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

CREATE POLICY "Admins podem atualizar organizacoes"
  ON public.organizacoes FOR UPDATE TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );

-- 4) parceiros: leitura plena apenas admin/integrado. Mantém política existente de fornecedor.
DROP POLICY IF EXISTS "Users can view parceiros by org" ON public.parceiros;

CREATE POLICY "Admins podem ver parceiros da org"
  ON public.parceiros FOR SELECT TO authenticated
  USING (
    ((integrado_id = public.get_my_integrado_id())
      AND (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'integrado'::app_role)))
    OR public.is_superadmin()
  );
