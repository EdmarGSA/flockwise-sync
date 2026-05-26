
-- 1) Prevent privilege escalation via profiles.role
CREATE OR REPLACE FUNCTION public.prevent_self_role_change_on_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Alteração do campo role em profiles não é permitida. Use a tabela user_roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change_on_profiles ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_change_on_profiles
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change_on_profiles();

-- 2) Restrict user_roles management to superadmin
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- 3) Restrict create_user_audit_log SELECT to superadmin only (emails exposure)
DROP POLICY IF EXISTS "Admins can view audit logs from their org" ON public.create_user_audit_log;

-- 4) Lock down weather_sync_log inserts
DROP POLICY IF EXISTS "Service role insert weather_sync_log" ON public.weather_sync_log;

CREATE POLICY "Service role insert weather_sync_log"
ON public.weather_sync_log
FOR INSERT
TO service_role
WITH CHECK (true);
