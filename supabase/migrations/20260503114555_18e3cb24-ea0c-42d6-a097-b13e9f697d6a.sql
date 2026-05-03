
-- Fix cameras_eventos INSERT policy: restrict to authenticated and scope to org
DROP POLICY IF EXISTS "Sistema pode inserir eventos" ON public.cameras_eventos;
CREATE POLICY "Org users can insert eventos"
ON public.cameras_eventos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cameras_canais c
    JOIN public.cameras_dvr d ON d.id = c.dvr_id
    WHERE c.id = cameras_eventos.canal_id
      AND (d.integrado_id = get_my_integrado_id() OR is_superadmin())
  )
);

-- Fix config_fechamento policies to use get_my_integrado_id() + authenticated
DROP POLICY IF EXISTS "Users can view their own config_fechamento" ON public.config_fechamento;
DROP POLICY IF EXISTS "Users can insert their own config_fechamento" ON public.config_fechamento;
DROP POLICY IF EXISTS "Users can update their own config_fechamento" ON public.config_fechamento;
CREATE POLICY "Org can view config_fechamento" ON public.config_fechamento
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "Org can insert config_fechamento" ON public.config_fechamento
  FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Org can update config_fechamento" ON public.config_fechamento
  FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- Fix config_silo policies
DROP POLICY IF EXISTS "Users can view their own config_silo" ON public.config_silo;
DROP POLICY IF EXISTS "Users can insert their own config_silo" ON public.config_silo;
DROP POLICY IF EXISTS "Users can update their own config_silo" ON public.config_silo;
CREATE POLICY "Org can view config_silo" ON public.config_silo
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "Org can insert config_silo" ON public.config_silo
  FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Org can update config_silo" ON public.config_silo
  FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- Fix config_validade_ovos policies
DROP POLICY IF EXISTS "Users can view own config" ON public.config_validade_ovos;
DROP POLICY IF EXISTS "Users can insert own config" ON public.config_validade_ovos;
DROP POLICY IF EXISTS "Users can update own config" ON public.config_validade_ovos;
CREATE POLICY "Org can view config_validade_ovos" ON public.config_validade_ovos
  FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "Org can insert config_validade_ovos" ON public.config_validade_ovos
  FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Org can update config_validade_ovos" ON public.config_validade_ovos
  FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- Restrict cameras_dvr SELECT to admins/integrado/superadmin (credentials/host are sensitive)
DROP POLICY IF EXISTS "DVRs visíveis por organização" ON public.cameras_dvr;
CREATE POLICY "Admins podem ver DVRs"
ON public.cameras_dvr FOR SELECT TO authenticated
USING (
  ((integrado_id = get_my_integrado_id())
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'integrado'::app_role)))
  OR is_superadmin()
);

-- Restrict ewelink_tokens SELECT to admins/integrado/superadmin (live OAuth tokens)
DROP POLICY IF EXISTS "Users can view own org tokens" ON public.ewelink_tokens;
CREATE POLICY "Admins can view ewelink tokens"
ON public.ewelink_tokens FOR SELECT TO authenticated
USING (
  (integrado_id = get_my_integrado_id()
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'integrado'::app_role)))
  OR is_superadmin()
);

-- Add org-scoped SELECT for admin_notifications (org-wide notifications when user_id is NULL)
CREATE POLICY "Org members can view org notifications"
ON public.admin_notifications FOR SELECT TO authenticated
USING (user_id IS NULL AND integrado_id = get_my_integrado_id());
