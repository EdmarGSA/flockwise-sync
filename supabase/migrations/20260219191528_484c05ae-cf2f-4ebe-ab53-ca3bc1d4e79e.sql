
-- 1. Create enums for tickets
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');
CREATE TYPE public.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'critica');

-- 2. Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status ticket_status NOT NULL DEFAULT 'aberto',
  prioridade ticket_prioridade NOT NULL DEFAULT 'media',
  categoria TEXT,
  criado_por UUID REFERENCES auth.users(id),
  atribuido_a UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_at TIMESTAMPTZ
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 3. Create onboarding_steps table
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  etapa TEXT NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false,
  concluida_em TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- 4. Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'info',
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  integrado_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create is_superadmin() function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'superadmin'::app_role
  );
END;
$$;

-- 6. RLS policies for support_tickets
CREATE POLICY "Superadmins can do everything on tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (criado_por = auth.uid());

CREATE POLICY "Users can create own tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (criado_por = auth.uid());

-- 7. RLS policies for onboarding_steps
CREATE POLICY "Superadmins can do everything on onboarding"
ON public.onboarding_steps FOR ALL TO authenticated
USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "Users can view own org onboarding"
ON public.onboarding_steps FOR SELECT TO authenticated
USING (integrado_id = public.get_my_integrado_id());

-- 8. RLS policies for admin_notifications
CREATE POLICY "Superadmins can do everything on notifications"
ON public.admin_notifications FOR ALL TO authenticated
USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE POLICY "Users can view own notifications"
ON public.admin_notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 9. Triggers
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_onboarding_steps_updated_at
  BEFORE UPDATE ON public.onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Superadmin cross-tenant read access
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all lotes"
ON public.lotes FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all areas"
ON public.areas FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all nucleos"
ON public.nucleos FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can view all galpoes"
ON public.galpoes FOR SELECT TO authenticated
USING (public.is_superadmin());
