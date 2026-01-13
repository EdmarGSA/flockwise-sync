-- Add linhagem and sexo columns to mortalidade_media
ALTER TABLE public.mortalidade_media 
ADD COLUMN linhagem linhagem_aves NOT NULL DEFAULT 'cobb_500',
ADD COLUMN sexo sexo_ave NOT NULL DEFAULT 'misto';

-- Create unique constraint for the combination
ALTER TABLE public.mortalidade_media 
ADD CONSTRAINT mortalidade_media_unique_combo 
UNIQUE (integrado_id, linhagem, sexo);

-- Update handle_new_user function to include linhagem and sexo
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- criar registro de mortalidade média com valores padrão (misto/cobb_500)
  IF target_integrado_id = new.id THEN
    INSERT INTO public.mortalidade_media (
      integrado_id,
      linhagem,
      sexo,
      mortalidade_7_dias,
      mortalidade_14_dias,
      mortalidade_21_dias,
      mortalidade_28_dias,
      mortalidade_35_dias,
      mortalidade_42_dias,
      mortalidade_acima_42_dias
    ) VALUES (
      new.id,
      'cobb_500',
      'misto',
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
$function$;