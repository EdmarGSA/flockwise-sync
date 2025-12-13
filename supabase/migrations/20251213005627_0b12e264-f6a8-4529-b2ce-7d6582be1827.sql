-- Change tipo_producao from enum to text to allow dynamic values from grupos_animal
ALTER TABLE public.nucleos 
ALTER COLUMN tipo_producao TYPE text USING tipo_producao::text;