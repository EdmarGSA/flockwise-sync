
CREATE VIEW public.rastreio_ovos AS
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
