-- Create audit log table for create-user edge function
CREATE TABLE public.create_user_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  target_email TEXT NOT NULL,
  integrado_id UUID,
  requested_by UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'retry')),
  error_type TEXT,
  error_message TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  created_user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_create_user_audit_request_id ON public.create_user_audit_log(request_id);
CREATE INDEX idx_create_user_audit_email ON public.create_user_audit_log(target_email);
CREATE INDEX idx_create_user_audit_integrado ON public.create_user_audit_log(integrado_id);
CREATE INDEX idx_create_user_audit_status ON public.create_user_audit_log(status);
CREATE INDEX idx_create_user_audit_created_at ON public.create_user_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.create_user_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins/superadmins can read audit logs (within their org for admin, all for superadmin)
CREATE POLICY "Superadmins can view all audit logs"
ON public.create_user_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can view audit logs from their org"
ON public.create_user_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND integrado_id IN (
    SELECT integrado_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- No update or delete policies => only service role can modify (bypasses RLS)
