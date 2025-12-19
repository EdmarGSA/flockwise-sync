-- Criar função para obter módulos acessíveis de um usuário
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
RETURNS TABLE(
  codigo text,
  nome text,
  rota text,
  icone text,
  ordem integer,
  fonte_permissao text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    END as fonte_permissao
  FROM public.modulos m
  LEFT JOIN public.user_modulos um ON m.id = um.modulo_id AND um.user_id = _user_id
  LEFT JOIN LATERAL (
    SELECT bool_or(rm.permitido) as permitido
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