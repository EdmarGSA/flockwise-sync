
CREATE TABLE public.ewelink_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  at_expired_at timestamptz NOT NULL,
  rt_expired_at timestamptz NOT NULL,
  region text NOT NULL DEFAULT 'us',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one token per organization
ALTER TABLE public.ewelink_tokens ADD CONSTRAINT ewelink_tokens_integrado_id_unique UNIQUE (integrado_id);

-- RLS
ALTER TABLE public.ewelink_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org tokens"
  ON public.ewelink_tokens FOR SELECT TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert own org tokens"
  ON public.ewelink_tokens FOR INSERT TO authenticated
  WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update own org tokens"
  ON public.ewelink_tokens FOR UPDATE TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can delete own org tokens"
  ON public.ewelink_tokens FOR DELETE TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

-- Auto-update updated_at
CREATE TRIGGER set_ewelink_tokens_updated_at
  BEFORE UPDATE ON public.ewelink_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
