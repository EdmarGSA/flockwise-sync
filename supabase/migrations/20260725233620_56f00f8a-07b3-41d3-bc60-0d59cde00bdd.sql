-- 1) cameras_dvr: admin/superadmin only + hide senha_encrypted from clients
DROP POLICY IF EXISTS "Admins podem ver DVRs" ON public.cameras_dvr;
DROP POLICY IF EXISTS "Admins podem atualizar DVRs" ON public.cameras_dvr;
DROP POLICY IF EXISTS "Admins podem deletar DVRs" ON public.cameras_dvr;
DROP POLICY IF EXISTS "Admins podem inserir DVRs" ON public.cameras_dvr;

CREATE POLICY "cameras_dvr_select_admin" ON public.cameras_dvr
FOR SELECT TO authenticated
USING ((integrado_id = get_my_integrado_id() AND has_role(auth.uid(), 'admin'::app_role)) OR is_superadmin());

CREATE POLICY "cameras_dvr_insert_admin" ON public.cameras_dvr
FOR INSERT TO authenticated
WITH CHECK ((integrado_id = get_my_integrado_id() AND has_role(auth.uid(), 'admin'::app_role)) OR is_superadmin());

CREATE POLICY "cameras_dvr_update_admin" ON public.cameras_dvr
FOR UPDATE TO authenticated
USING ((integrado_id = get_my_integrado_id() AND has_role(auth.uid(), 'admin'::app_role)) OR is_superadmin())
WITH CHECK ((integrado_id = get_my_integrado_id() AND has_role(auth.uid(), 'admin'::app_role)) OR is_superadmin());

CREATE POLICY "cameras_dvr_delete_admin" ON public.cameras_dvr
FOR DELETE TO authenticated
USING ((integrado_id = get_my_integrado_id() AND has_role(auth.uid(), 'admin'::app_role)) OR is_superadmin());

-- 2) Column-level revokes for secret columns (writes still allowed, reads blocked)
DO $$
DECLARE
  v_cols text;
BEGIN
  -- cameras_dvr
  SELECT string_agg(quote_ident(column_name), ', ') INTO v_cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='cameras_dvr' AND column_name <> 'senha_encrypted';
  EXECUTE 'REVOKE SELECT ON public.cameras_dvr FROM authenticated, anon';
  EXECUTE format('GRANT SELECT (%s) ON public.cameras_dvr TO authenticated', v_cols);

  -- dispositivos_iot
  SELECT string_agg(quote_ident(column_name), ', ') INTO v_cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='dispositivos_iot'
    AND column_name NOT IN ('auth_token','sensor_wifi_token');
  EXECUTE 'REVOKE SELECT ON public.dispositivos_iot FROM authenticated, anon';
  EXECUTE format('GRANT SELECT (%s) ON public.dispositivos_iot TO authenticated', v_cols);

  -- webhooks_fornecedor
  SELECT string_agg(quote_ident(column_name), ', ') INTO v_cols
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='webhooks_fornecedor' AND column_name <> 'secret';
  EXECUTE 'REVOKE SELECT ON public.webhooks_fornecedor FROM authenticated, anon';
  EXECUTE format('GRANT SELECT (%s) ON public.webhooks_fornecedor TO authenticated', v_cols);
END $$;

-- anon should not write to these tables at all
REVOKE INSERT, UPDATE, DELETE ON public.cameras_dvr FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.dispositivos_iot FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.webhooks_fornecedor FROM anon;
GRANT ALL ON public.cameras_dvr TO service_role;
GRANT ALL ON public.dispositivos_iot TO service_role;
GRANT ALL ON public.webhooks_fornecedor TO service_role;

-- 3) ewelink_tokens: service-role only, explicit policy so RLS is not policy-less
REVOKE ALL ON public.ewelink_tokens FROM anon, authenticated;
GRANT ALL ON public.ewelink_tokens TO service_role;
DROP POLICY IF EXISTS "ewelink_tokens_no_client_access" ON public.ewelink_tokens;
CREATE POLICY "ewelink_tokens_no_client_access" ON public.ewelink_tokens
FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);

-- 4) realtime.messages: restrict subscriptions to the caller's organization topics
DROP POLICY IF EXISTS "Authenticated users only realtime" ON realtime.messages;
CREATE POLICY "Realtime topics scoped to own organization" ON realtime.messages
FOR SELECT TO authenticated
USING (
  public.get_my_integrado_id() IS NOT NULL
  AND (
    realtime.topic() = public.get_my_integrado_id()::text
    OR realtime.topic() LIKE public.get_my_integrado_id()::text || ':%'
  )
);