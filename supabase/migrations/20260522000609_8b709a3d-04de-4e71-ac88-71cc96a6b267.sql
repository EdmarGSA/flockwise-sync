-- Override por galpão (nullable: NULL = herda da org)
ALTER TABLE public.galpoes
  ADD COLUMN IF NOT EXISTS usar_percentis_automacao boolean;

-- Modo sombra: decisão alternativa não-executada
ALTER TABLE public.log_decisao_clima
  ADD COLUMN IF NOT EXISTS decisao_sombra jsonb;

-- Tabela de aprendizado por zona
CREATE TABLE IF NOT EXISTS public.aprendizado_zona_clima (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  zona text NOT NULL CHECK (zona IN ('pinteiro','engorda','geral')),
  hora_dia smallint NOT NULL CHECK (hora_dia BETWEEN 0 AND 23),
  offset_c numeric(5,2) NOT NULL DEFAULT 0,
  amostras integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (galpao_id, zona, hora_dia)
);

CREATE INDEX IF NOT EXISTS idx_aprend_zona_galpao ON public.aprendizado_zona_clima(galpao_id, zona);
CREATE INDEX IF NOT EXISTS idx_aprend_zona_org ON public.aprendizado_zona_clima(integrado_id);

ALTER TABLE public.aprendizado_zona_clima ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver aprendizado zona org"
  ON public.aprendizado_zona_clima FOR SELECT
  TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "gerenciar aprendizado zona admin"
  ON public.aprendizado_zona_clima FOR ALL
  TO authenticated
  USING (integrado_id = get_my_integrado_id() OR is_superadmin())
  WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());