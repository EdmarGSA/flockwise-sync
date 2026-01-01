-- Atualizar a função handle_new_user para criar mortalidade_media automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_integrado_id uuid;
BEGIN
  -- Determinar o integrado_id
  target_integrado_id := COALESCE((new.raw_user_meta_data ->> 'integrado_id')::uuid, new.id);
  
  -- Criar profile
  INSERT INTO public.profiles (id, full_name, integrado_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    target_integrado_id
  );
  
  -- Se o usuário é o próprio integrado (novo cadastro principal),
  -- criar registro de mortalidade média com valores padrão
  IF target_integrado_id = new.id THEN
    INSERT INTO public.mortalidade_media (
      integrado_id,
      mortalidade_7_dias,
      mortalidade_14_dias,
      mortalidade_21_dias,
      mortalidade_28_dias,
      mortalidade_35_dias,
      mortalidade_42_dias,
      mortalidade_acima_42_dias
    ) VALUES (
      new.id,
      0.5,
      0.3,
      0.3,
      0.3,
      0.5,
      0.5,
      0.8
    );
  END IF;
  
  RETURN new;
END;
$$;

-- Inserir configuração padrão para integrados existentes que ainda não têm
INSERT INTO mortalidade_media (
  integrado_id,
  mortalidade_7_dias,
  mortalidade_14_dias,
  mortalidade_21_dias,
  mortalidade_28_dias,
  mortalidade_35_dias,
  mortalidade_42_dias,
  mortalidade_acima_42_dias
)
SELECT 
  p.id as integrado_id,
  0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8
FROM profiles p
WHERE p.integrado_id = p.id
AND NOT EXISTS (
  SELECT 1 FROM mortalidade_media mm 
  WHERE mm.integrado_id = p.id
);