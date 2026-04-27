-- Remover identities órfãs em auth.identities (apontam para auth.users que não existem mais)
DELETE FROM auth.identities i
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = i.user_id
);