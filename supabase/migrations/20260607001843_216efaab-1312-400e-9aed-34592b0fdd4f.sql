
-- 1. Harden get_my_integrado_id to return NULL when profile lacks integrado_id
CREATE OR REPLACE FUNCTION public.get_my_integrado_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT integrado_id FROM public.profiles WHERE id = auth.uid() AND integrado_id IS NOT NULL
$function$;

-- 2. Align ewelink_tokens mutating policies to {authenticated}
DROP POLICY IF EXISTS "Admins can insert ewelink tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Admins can update ewelink tokens" ON public.ewelink_tokens;
DROP POLICY IF EXISTS "Admins can delete ewelink tokens" ON public.ewelink_tokens;

CREATE POLICY "Admins can insert ewelink tokens"
  ON public.ewelink_tokens FOR INSERT TO authenticated
  WITH CHECK (
    ((integrado_id = get_my_integrado_id())
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'integrado'::app_role)))
    OR is_superadmin()
  );

CREATE POLICY "Admins can update ewelink tokens"
  ON public.ewelink_tokens FOR UPDATE TO authenticated
  USING (
    ((integrado_id = get_my_integrado_id())
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'integrado'::app_role)))
    OR is_superadmin()
  );

CREATE POLICY "Admins can delete ewelink tokens"
  ON public.ewelink_tokens FOR DELETE TO authenticated
  USING (
    ((integrado_id = get_my_integrado_id())
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'integrado'::app_role)))
    OR is_superadmin()
  );

-- 3. Lock realtime.messages so only authenticated users can subscribe.
-- Postgres_changes subscriptions still enforce per-table RLS on source tables;
-- broadcast/presence channels are not used for cross-tenant sensitive data.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated users only realtime') THEN
    DROP POLICY "Authenticated users only realtime" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Authenticated users only realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);
