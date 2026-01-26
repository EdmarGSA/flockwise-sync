-- 1. Adicionar user_id na tabela de vendedores
ALTER TABLE public.vendedores_fornecedor
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índice único para garantir 1:1
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedores_fornecedor_user_id 
  ON public.vendedores_fornecedor(user_id) WHERE user_id IS NOT NULL;

-- 3. Adicionar vendedor_fornecedor_id no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vendedor_fornecedor_id UUID;

-- 4. Adicionar role ao enum (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum 
                 WHERE enumlabel = 'vendedor_fornecedor' 
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendedor_fornecedor';
  END IF;
END$$;