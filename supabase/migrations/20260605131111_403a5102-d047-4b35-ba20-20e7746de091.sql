DROP POLICY IF EXISTS "Admin can insert role_modulos" ON public.role_modulos;
DROP POLICY IF EXISTS "Admin can update role_modulos" ON public.role_modulos;
DROP POLICY IF EXISTS "Admin can delete role_modulos" ON public.role_modulos;

CREATE POLICY "Superadmin can insert role_modulos"
  ON public.role_modulos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can update role_modulos"
  ON public.role_modulos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can delete role_modulos"
  ON public.role_modulos FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Users can insert user_modulos for org" ON public.user_modulos;
DROP POLICY IF EXISTS "Users can update user_modulos for org" ON public.user_modulos;
DROP POLICY IF EXISTS "Users can delete user_modulos for org" ON public.user_modulos;