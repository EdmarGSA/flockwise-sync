-- Desativar módulo Portal do Fornecedor (sistema B2B separado)
UPDATE public.modulos 
SET ativo = false 
WHERE codigo = 'portal-fornecedor';

-- Remover permissões de usuários para este módulo
DELETE FROM public.user_modulos 
WHERE modulo_id IN (SELECT id FROM public.modulos WHERE codigo = 'portal-fornecedor');

-- Remover permissões de roles para este módulo
DELETE FROM public.role_modulos 
WHERE modulo_id IN (SELECT id FROM public.modulos WHERE codigo = 'portal-fornecedor');