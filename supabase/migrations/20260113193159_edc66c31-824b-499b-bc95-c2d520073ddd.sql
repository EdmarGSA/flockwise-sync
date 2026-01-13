-- Atualizar o trigger handle_new_user para criar role admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_integrado_id uuid;
BEGIN
  -- Determinar o integrado_id
  target_integrado_id := COALESCE(
    (new.raw_user_meta_data ->> 'integrado_id')::uuid, 
    new.id
  );
  
  -- Criar profile
  INSERT INTO public.profiles (id, full_name, integrado_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    target_integrado_id
  );
  
  -- Se o usuário é o próprio integrado (novo cadastro principal),
  -- criar role de admin e dados padrão automaticamente
  IF target_integrado_id = new.id THEN
    -- Criar role admin para dono da organização
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
    
    -- Criar registro de mortalidade média com valores padrão
    INSERT INTO public.mortalidade_media (
      integrado_id, linhagem, sexo,
      mortalidade_7_dias, mortalidade_14_dias, mortalidade_21_dias,
      mortalidade_28_dias, mortalidade_35_dias, mortalidade_42_dias,
      mortalidade_acima_42_dias
    ) VALUES (
      new.id, 'cobb_500', 'misto',
      0.5, 0.3, 0.3, 0.3, 0.5, 0.5, 0.8
    );
  END IF;
  
  RETURN new;
END;
$$;