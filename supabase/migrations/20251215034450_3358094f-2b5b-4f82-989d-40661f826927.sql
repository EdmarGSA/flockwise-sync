-- Corrigir search_path na função calcular_fase_postura
CREATE OR REPLACE FUNCTION public.calcular_fase_postura(semanas_vida INTEGER)
RETURNS fase_postura
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN semanas_vida <= 6 THEN 'cria'::fase_postura
    WHEN semanas_vida <= 18 THEN 'recria'::fase_postura
    ELSE 'producao'::fase_postura
  END
$$;