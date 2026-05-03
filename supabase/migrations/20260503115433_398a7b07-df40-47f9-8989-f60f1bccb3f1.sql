
CREATE OR REPLACE FUNCTION public.redact_sensitive_jsonb(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb := p;
  v_key text;
  v_sensitive text[] := ARRAY[
    'password','senha','token','access_token','refresh_token',
    'secret','authorization','api_key','apikey','jwt',
    'cpf','cnpj','rg'
  ];
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN
    RETURN p;
  END IF;
  FOREACH v_key IN ARRAY v_sensitive LOOP
    IF v_out ? v_key THEN
      v_out := jsonb_set(v_out, ARRAY[v_key], '"***REDACTED***"'::jsonb, false);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.redact_sensitive_jsonb(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_secdef_call(
  p_function_name text,
  p_key_param text DEFAULT NULL,
  p_extra jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text := p_key_param;
  v_extra jsonb := p_extra;
  v_local text;
  v_domain text;
BEGIN
  -- Email redaction on key_param
  IF v_key IS NOT NULL AND v_key ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    v_local := split_part(v_key, '@', 1);
    v_domain := split_part(v_key, '@', 2);
    IF length(v_local) <= 1 THEN
      v_key := '*@' || v_domain;
    ELSE
      v_key := substr(v_local, 1, 1) || '***@' || v_domain;
    END IF;
  END IF;

  -- Truncate to keep storage bounded
  IF v_key IS NOT NULL AND length(v_key) > 200 THEN
    v_key := substr(v_key, 1, 197) || '...';
  END IF;

  -- Redact known sensitive keys in extra
  v_extra := public.redact_sensitive_jsonb(v_extra);

  INSERT INTO public.security_definer_audit_log (user_id, integrado_id, function_name, key_param, extra)
  VALUES (auth.uid(), get_my_integrado_id(), p_function_name, v_key, v_extra);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_secdef_call(text, text, jsonb) FROM PUBLIC, anon, authenticated;
