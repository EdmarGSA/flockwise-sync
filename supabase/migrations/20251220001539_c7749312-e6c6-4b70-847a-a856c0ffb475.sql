-- =====================================================
-- PLANO COMPLETO: Sistema de Controle de Acesso a Módulos
-- =====================================================

-- Fase 1: Criar ENUM para nível de acesso
CREATE TYPE public.nivel_acesso AS ENUM ('view', 'edit', 'full');

-- Fase 2: Criar tabela de módulos (catálogo)
CREATE TABLE public.modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text,
  rota text NOT NULL,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fase 3: Criar tabela de permissões por role
CREATE TABLE public.role_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  modulo_id uuid REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
  permitido boolean DEFAULT true,
  nivel_acesso nivel_acesso DEFAULT 'view',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, modulo_id)
);

-- Fase 4: Criar tabela de permissões individuais com auditoria
CREATE TABLE public.user_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  modulo_id uuid REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
  permitido boolean NOT NULL,
  nivel_acesso nivel_acesso DEFAULT 'view',
  integrado_id uuid NOT NULL,
  -- Campos de auditoria
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  -- UNIQUE corrigido para multi-tenant
  UNIQUE(user_id, modulo_id, integrado_id)
);

-- Fase 5: Popular módulos do sistema
INSERT INTO public.modulos (codigo, nome, descricao, icone, rota, ordem) VALUES
  ('lotes', 'Meus Lotes', 'Gestão de lotes de aves', 'Egg', '/meus-lotes', 1),
  ('gestao-campo', 'Gestão de Campo', 'Acompanhamento de campo', 'Map', '/gestao-campo', 2),
  ('gestao-consumo', 'Gestão de Consumo', 'Controle de consumo de ração', 'Utensils', '/gestao-consumo', 3),
  ('veterinario', 'Veterinário', 'Acompanhamento veterinário', 'Stethoscope', '/veterinario', 4),
  ('fabrica-racao', 'Fábrica de Ração', 'Produção e estoque de ração', 'Factory', '/fabrica-racao', 5),
  ('estoque-ovos', 'Estoque de Ovos', 'Gestão de estoque de ovos', 'Package', '/estoque-ovos', 6),
  ('financeiro', 'Financeiro', 'Gestão financeira', 'DollarSign', '/financeiro', 7),
  ('comercial', 'Comercial', 'Vendas e pedidos', 'ShoppingCart', '/comercial', 8),
  ('cockpit', 'Cockpit Thoth', 'Painel de indicadores', 'Gauge', '/cockpit', 9),
  ('configuracoes', 'Configurações', 'Configurações do sistema', 'Settings', '/configuracoes', 10),
  ('cadastros', 'Cadastros', 'Cadastros gerais', 'Database', '/cadastros', 11);

-- Fase 6: Popular permissões padrão por role

-- Admin: acesso FULL a todos os módulos
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'admin'::app_role, id, true, 'full'::nivel_acesso FROM public.modulos;

-- Integrado: lotes, gestao-campo, gestao-consumo (edit)
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'integrado'::app_role, id, true, 'edit'::nivel_acesso 
FROM public.modulos WHERE codigo IN ('lotes', 'gestao-campo', 'gestao-consumo');

-- Veterinário: lotes (view), veterinario (full), gestao-consumo (view)
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'veterinario'::app_role, id, true, 
  CASE codigo 
    WHEN 'veterinario' THEN 'full'::nivel_acesso
    ELSE 'view'::nivel_acesso
  END
FROM public.modulos WHERE codigo IN ('lotes', 'veterinario', 'gestao-consumo');

-- Técnico: lotes (view), gestao-campo (edit)
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'tecnico'::app_role, id, true,
  CASE codigo 
    WHEN 'gestao-campo' THEN 'edit'::nivel_acesso
    ELSE 'view'::nivel_acesso
  END
FROM public.modulos WHERE codigo IN ('lotes', 'gestao-campo');

-- Comprador: fabrica-racao (edit), comercial (view)
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'comprador'::app_role, id, true,
  CASE codigo 
    WHEN 'fabrica-racao' THEN 'edit'::nivel_acesso
    ELSE 'view'::nivel_acesso
  END
FROM public.modulos WHERE codigo IN ('fabrica-racao', 'comercial');

-- Conferente: fabrica-racao (view), estoque-ovos (edit)
INSERT INTO public.role_modulos (role, modulo_id, permitido, nivel_acesso)
SELECT 'conferente'::app_role, id, true,
  CASE codigo 
    WHEN 'estoque-ovos' THEN 'edit'::nivel_acesso
    ELSE 'view'::nivel_acesso
  END
FROM public.modulos WHERE codigo IN ('fabrica-racao', 'estoque-ovos');

-- Fase 7: RLS para modulos (catálogo público para autenticados)
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view modulos" ON public.modulos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert modulos" ON public.modulos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update modulos" ON public.modulos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete modulos" ON public.modulos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fase 8: RLS para role_modulos (admin gerencia)
ALTER TABLE public.role_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view role_modulos" ON public.role_modulos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert role_modulos" ON public.role_modulos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update role_modulos" ON public.role_modulos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete role_modulos" ON public.role_modulos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fase 9: RLS granular para user_modulos
ALTER TABLE public.user_modulos ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários da mesma organização podem ver
CREATE POLICY "Same org can view user_modulos" ON public.user_modulos
  FOR SELECT TO authenticated 
  USING (public.same_organization(user_id));

-- INSERT: Admin da organização pode conceder
CREATE POLICY "Admin can insert user_modulos" ON public.user_modulos
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    AND public.same_organization(user_id)
  );

-- UPDATE: Admin da organização pode modificar
CREATE POLICY "Admin can update user_modulos" ON public.user_modulos
  FOR UPDATE TO authenticated 
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND public.same_organization(user_id)
  );

-- DELETE: Admin pode remover (mas não de outros admins)
CREATE POLICY "Admin can delete user_modulos" ON public.user_modulos
  FOR DELETE TO authenticated 
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND public.same_organization(user_id)
    AND NOT public.has_role(user_id, 'admin')
  );

-- Fase 10: Triggers de auditoria
CREATE OR REPLACE FUNCTION public.update_user_modulos_audit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER user_modulos_audit_trigger
  BEFORE UPDATE ON public.user_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_user_modulos_audit();

CREATE OR REPLACE FUNCTION public.set_user_modulos_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER user_modulos_created_by_trigger
  BEFORE INSERT ON public.user_modulos
  FOR EACH ROW EXECUTE FUNCTION public.set_user_modulos_created_by();

-- Fase 11: Atualizar função user_can_access_module com suporte a nível de acesso
DROP FUNCTION IF EXISTS public.user_can_access_module(uuid, text);

CREATE OR REPLACE FUNCTION public.user_can_access_module(
  _user_id uuid, 
  _module_code text,
  _required_level nivel_acesso DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modulo_id uuid;
  v_individual record;
  v_role_level nivel_acesso;
BEGIN
  -- Buscar ID do módulo
  SELECT id INTO v_modulo_id FROM public.modulos WHERE codigo = _module_code AND ativo = true;
  IF v_modulo_id IS NULL THEN RETURN false; END IF;
  
  -- 1. Verificar permissão individual (tem precedência)
  SELECT permitido, nivel_acesso INTO v_individual
  FROM public.user_modulos 
  WHERE user_id = _user_id AND modulo_id = v_modulo_id;
  
  IF v_individual.permitido IS NOT NULL THEN
    IF NOT v_individual.permitido THEN RETURN false; END IF;
    -- Verificar nível de acesso
    RETURN CASE v_individual.nivel_acesso
      WHEN 'full' THEN true
      WHEN 'edit' THEN _required_level IN ('view', 'edit')
      WHEN 'view' THEN _required_level = 'view'
      ELSE false
    END;
  END IF;
  
  -- 2. Verificar permissão por role (herança - pega o maior nível)
  SELECT MAX(rm.nivel_acesso) INTO v_role_level
  FROM public.user_roles ur
  JOIN public.role_modulos rm ON ur.role = rm.role
  WHERE ur.user_id = _user_id 
    AND rm.modulo_id = v_modulo_id 
    AND rm.permitido = true;
  
  IF v_role_level IS NULL THEN RETURN false; END IF;
  
  RETURN CASE v_role_level
    WHEN 'full' THEN true
    WHEN 'edit' THEN _required_level IN ('view', 'edit')
    WHEN 'view' THEN _required_level = 'view'
    ELSE false
  END;
END;
$$;

-- Fase 12: Atualizar função get_user_accessible_modules com nivel_acesso
DROP FUNCTION IF EXISTS public.get_user_accessible_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
RETURNS TABLE(
  codigo text,
  nome text,
  rota text,
  icone text,
  ordem integer,
  fonte_permissao text,
  nivel_acesso text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.codigo,
    m.nome,
    m.rota,
    m.icone,
    m.ordem,
    CASE 
      WHEN um.permitido IS NOT NULL THEN 'individual'::text
      ELSE 'role'::text
    END as fonte_permissao,
    COALESCE(um.nivel_acesso::text, role_perm.max_nivel::text, 'view') as nivel_acesso
  FROM public.modulos m
  LEFT JOIN public.user_modulos um ON m.id = um.modulo_id AND um.user_id = _user_id
  LEFT JOIN LATERAL (
    SELECT MAX(rm.nivel_acesso::text) as max_nivel, bool_or(rm.permitido) as permitido
    FROM public.user_roles ur
    JOIN public.role_modulos rm ON ur.role = rm.role
    WHERE ur.user_id = _user_id AND rm.modulo_id = m.id
  ) role_perm ON true
  WHERE m.ativo = true
    AND (
      um.permitido = true 
      OR (um.permitido IS NULL AND role_perm.permitido = true)
    )
  ORDER BY m.ordem;
END;
$$;

-- Fase 13: Trigger para updated_at nas tabelas modulos e role_modulos
CREATE TRIGGER modulos_updated_at
  BEFORE UPDATE ON public.modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER role_modulos_updated_at
  BEFORE UPDATE ON public.role_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();