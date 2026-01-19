-- 1. Restaurar acesso do admin principal
INSERT INTO public.user_roles (user_id, role)
VALUES ('d351a123-d5fa-43fe-a6e1-2ead36d96d1f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Sincronizar todos os usuários que têm role em profiles mas não em user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM public.profiles p
WHERE p.role IS NOT NULL 
  AND p.role != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Remover permissão individual do portal-fornecedor para o admin (opcional - ele terá acesso via role)
DELETE FROM public.user_modulos 
WHERE user_id = 'd351a123-d5fa-43fe-a6e1-2ead36d96d1f'
  AND modulo_id = (SELECT id FROM public.modulos WHERE codigo = 'portal-fornecedor');