-- Fix get_veterinarios() function to filter by organization (matching get_criadores pattern)
CREATE OR REPLACE FUNCTION public.get_veterinarios()
RETURNS TABLE (
  id UUID,
  full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'veterinario'
    AND p.integrado_id = get_my_integrado_id()
  ORDER BY p.full_name
$$;