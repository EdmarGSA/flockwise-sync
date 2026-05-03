
-- 1) Tighten ewelink_tokens write policies to admin/integrado roles
DROP POLICY IF EXISTS "Users can insert own org tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Users can update own org tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Users can delete own org tokens" ON public.ewelink_tokens;

CREATE POLICY "Admins can insert ewelink tokens"
ON public.ewelink_tokens FOR INSERT
WITH CHECK (
  ((integrado_id = get_my_integrado_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'integrado'::app_role)))
  OR is_superadmin()
);

CREATE POLICY "Admins can update ewelink tokens"
ON public.ewelink_tokens FOR UPDATE
USING (
  ((integrado_id = get_my_integrado_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'integrado'::app_role)))
  OR is_superadmin()
);

CREATE POLICY "Admins can delete ewelink tokens"
ON public.ewelink_tokens FOR DELETE
USING (
  ((integrado_id = get_my_integrado_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'integrado'::app_role)))
  OR is_superadmin()
);

-- 2) Fix config_* update/insert policies to use get_my_integrado_id() instead of auth.uid()
DROP POLICY IF EXISTS "Org can update config_fechamento" ON public.config_fechamento;
DROP POLICY IF EXISTS "Org can insert config_fechamento" ON public.config_fechamento;
CREATE POLICY "Org can update config_fechamento"
ON public.config_fechamento FOR UPDATE
USING ((integrado_id = get_my_integrado_id()) OR is_superadmin());
CREATE POLICY "Org can insert config_fechamento"
ON public.config_fechamento FOR INSERT
WITH CHECK ((integrado_id = get_my_integrado_id()) OR is_superadmin());

DROP POLICY IF EXISTS "Org can update config_silo" ON public.config_silo;
DROP POLICY IF EXISTS "Org can insert config_silo" ON public.config_silo;
CREATE POLICY "Org can update config_silo"
ON public.config_silo FOR UPDATE
USING ((integrado_id = get_my_integrado_id()) OR is_superadmin());
CREATE POLICY "Org can insert config_silo"
ON public.config_silo FOR INSERT
WITH CHECK ((integrado_id = get_my_integrado_id()) OR is_superadmin());

DROP POLICY IF EXISTS "Org can update config_validade_ovos" ON public.config_validade_ovos;
DROP POLICY IF EXISTS "Org can insert config_validade_ovos" ON public.config_validade_ovos;
CREATE POLICY "Org can update config_validade_ovos"
ON public.config_validade_ovos FOR UPDATE
USING ((integrado_id = get_my_integrado_id()) OR is_superadmin());
CREATE POLICY "Org can insert config_validade_ovos"
ON public.config_validade_ovos FOR INSERT
WITH CHECK ((integrado_id = get_my_integrado_id()) OR is_superadmin());
