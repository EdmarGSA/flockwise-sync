-- 1. Adicionar coluna integrado_id à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS integrado_id uuid REFERENCES auth.users(id);

-- 2. Backfill: usuários existentes são donos de si mesmos (proprietários da organização)
UPDATE public.profiles 
SET integrado_id = id 
WHERE integrado_id IS NULL;

-- 3. Criar função para verificar se usuários pertencem à mesma organização
CREATE OR REPLACE FUNCTION public.same_organization(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.integrado_id = p2.integrado_id
    WHERE p1.id = auth.uid() 
      AND p2.id = _user_id
  )
$$;

-- 4. Remover políticas antigas que permitem acesso cross-organization
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 5. Criar novas políticas RLS com isolamento por organização
-- SELECT: usuários podem ver seu próprio perfil OU membros da mesma organização (se admin)
CREATE POLICY "Users can view own and org profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR public.same_organization(id)
);

-- UPDATE: usuários podem atualizar seu próprio perfil OU membros da mesma organização (se admin)
CREATE POLICY "Users can update own and org profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  OR (public.has_role(auth.uid(), 'admin') AND public.same_organization(id))
);

-- INSERT: Trigger handle_new_user já cria o profile, então permitir inserção
CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- 6. Atualizar trigger handle_new_user para incluir integrado_id (será null inicialmente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, integrado_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    COALESCE((new.raw_user_meta_data ->> 'integrado_id')::uuid, new.id)
  );
  RETURN new;
END;
$$;