-- Inserir permissão para o role fornecedor acessar APENAS o portal-fornecedor
INSERT INTO role_modulos (role, modulo_id, nivel_acesso, permitido)
SELECT 'fornecedor', id, 'full', true
FROM modulos WHERE codigo = 'portal-fornecedor'
ON CONFLICT (role, modulo_id) DO NOTHING;

-- Também garantir que o role 'criador' tenha acesso aos módulos básicos se ainda não tiver
INSERT INTO role_modulos (role, modulo_id, nivel_acesso, permitido)
SELECT 'criador', id, 'view', true
FROM modulos WHERE codigo IN ('meus-lotes', 'veterinario')
ON CONFLICT (role, modulo_id) DO NOTHING;