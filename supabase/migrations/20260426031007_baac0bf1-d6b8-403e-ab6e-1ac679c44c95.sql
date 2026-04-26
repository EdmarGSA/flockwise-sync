-- 1. Auditoria
ALTER TABLE public.mapbox_config
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 2. Trigger de auditoria
CREATE OR REPLACE FUNCTION public.set_mapbox_config_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mapbox_config_audit ON public.mapbox_config;
CREATE TRIGGER trg_mapbox_config_audit
BEFORE INSERT OR UPDATE ON public.mapbox_config
FOR EACH ROW EXECUTE FUNCTION public.set_mapbox_config_audit();

-- 3. Endurecer policies de escrita por papel (admin / integrado / superadmin)
DROP POLICY IF EXISTS mapbox_config_insert_own_org ON public.mapbox_config;
CREATE POLICY mapbox_config_insert_own_org
ON public.mapbox_config
FOR INSERT
TO authenticated
WITH CHECK (
  (integrado_id = public.get_my_integrado_id())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'integrado'::app_role)
    OR public.is_superadmin()
  )
);

DROP POLICY IF EXISTS mapbox_config_update_own_org ON public.mapbox_config;
CREATE POLICY mapbox_config_update_own_org
ON public.mapbox_config
FOR UPDATE
TO authenticated
USING (
  (integrado_id = public.get_my_integrado_id() OR public.is_superadmin())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'integrado'::app_role)
    OR public.is_superadmin()
  )
)
WITH CHECK (
  (integrado_id = public.get_my_integrado_id() OR public.is_superadmin())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'integrado'::app_role)
    OR public.is_superadmin()
  )
);

DROP POLICY IF EXISTS mapbox_config_delete_own_org ON public.mapbox_config;
CREATE POLICY mapbox_config_delete_own_org
ON public.mapbox_config
FOR DELETE
TO authenticated
USING (
  (integrado_id = public.get_my_integrado_id() OR public.is_superadmin())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'integrado'::app_role)
    OR public.is_superadmin()
  )
);