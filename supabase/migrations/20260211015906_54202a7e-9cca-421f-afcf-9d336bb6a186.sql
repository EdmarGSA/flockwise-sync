
-- Fix security definer view warning by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.rastreio_ovos;

CREATE VIEW public.rastreio_ovos
WITH (security_invoker = true)
AS
SELECT
  eo.lote_interno,
  eo.tipo_ovo,
  eo.classificacao_peso,
  eo.data_producao,
  eo.data_validade,
  n.nome AS nucleo_nome,
  g.nome AS galpao_nome,
  o.nome AS produtor_nome,
  o.cidade AS produtor_cidade,
  o.estado AS produtor_estado
FROM public.estoque_ovos eo
LEFT JOIN public.lotes l ON eo.lote_producao_id = l.id
LEFT JOIN public.galpoes g ON l.galpao_id = g.id
LEFT JOIN public.nucleos n ON l.nucleo_id = n.id
LEFT JOIN public.organizacoes o ON eo.integrado_id = o.integrado_id
WHERE eo.ativo = true;

GRANT SELECT ON public.rastreio_ovos TO anon;
GRANT SELECT ON public.rastreio_ovos TO authenticated;

-- We need anon to be able to SELECT on the underlying tables for the view to work
-- Create a limited RLS policy on estoque_ovos for anon read access (limited columns via view)
CREATE POLICY "Anon can read estoque_ovos for traceability"
  ON public.estoque_ovos FOR SELECT
  TO anon
  USING (ativo = true);

-- Allow anon SELECT on related tables used by the view
CREATE POLICY "Anon can read lotes for traceability"
  ON public.lotes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read galpoes for traceability"
  ON public.galpoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read nucleos for traceability"
  ON public.nucleos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can read organizacoes for traceability"
  ON public.organizacoes FOR SELECT
  TO anon
  USING (true);
