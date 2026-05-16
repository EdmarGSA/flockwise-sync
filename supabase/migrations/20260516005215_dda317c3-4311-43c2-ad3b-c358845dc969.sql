
-- Cache da análise IA por lote
ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS analise_ia_relatorio jsonb;

-- Benchmark de linhagem com base em lotes fechados do mesmo integrado
CREATE OR REPLACE FUNCTION public.get_benchmark_linhagem(
  p_linhagem text,
  p_sexo text DEFAULT NULL,
  p_integrado_id uuid DEFAULT NULL
)
RETURNS TABLE(
  semana integer,
  peso_medio_kg numeric,
  mortalidade_acum_pct numeric,
  amostra integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_integrado uuid := COALESCE(p_integrado_id, get_my_integrado_id());
  v_lote_ids uuid[];
  v_amostra integer;
BEGIN
  PERFORM log_secdef_call('get_benchmark_linhagem', p_linhagem, jsonb_build_object('sexo', p_sexo));

  -- Lotes fechados elegíveis (mesmo integrado, mesma linhagem, >=5000 aves, últimos 24 meses, >=3 lotes)
  SELECT array_agg(l.id) INTO v_lote_ids
  FROM lotes l
  WHERE l.integrado_id = v_integrado
    AND l.status = 'fechado'
    AND l.quantidade_aves >= 5000
    AND l.data_alojamento >= (CURRENT_DATE - INTERVAL '24 months')
    AND (l.linhagem::text = p_linhagem OR l.linhagem_postura::text = p_linhagem)
    AND (p_sexo IS NULL OR l.sexo::text = p_sexo);

  v_amostra := COALESCE(array_length(v_lote_ids, 1), 0);
  IF v_amostra < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH pesagens_agg AS (
    SELECT
      p.lote_id,
      GREATEST(1, FLOOR((p.data_pesagem - l.data_alojamento)::numeric / 7)::integer + 1) AS semana,
      AVG((pi.peso_bruto_g - pi.peso_tara_g) / NULLIF(pi.quantidade_aves, 0) / 1000.0) AS peso_kg
    FROM pesagens p
    JOIN lotes l ON l.id = p.lote_id
    JOIN pesagem_itens pi ON pi.pesagem_id = p.id
    WHERE p.lote_id = ANY(v_lote_ids) AND l.data_alojamento IS NOT NULL
    GROUP BY p.lote_id, semana
  ),
  mort_agg AS (
    SELECT
      m.lote_id,
      GREATEST(1, FLOOR((m.data_registro - l.data_alojamento)::numeric / 7)::integer + 1) AS semana,
      SUM(mi.quantidade)::numeric / NULLIF(l.quantidade_aves, 0) * 100 AS pct
    FROM mortalidade m
    JOIN lotes l ON l.id = m.lote_id
    JOIN mortalidade_itens mi ON mi.mortalidade_id = m.id
    WHERE m.lote_id = ANY(v_lote_ids) AND l.data_alojamento IS NOT NULL
    GROUP BY m.lote_id, semana, l.quantidade_aves
  ),
  semanas AS (
    SELECT DISTINCT s FROM (
      SELECT semana s FROM pesagens_agg UNION SELECT semana FROM mort_agg
    ) x WHERE s BETWEEN 1 AND 100
  )
  SELECT
    s.s::integer AS semana,
    ROUND(AVG(pa.peso_kg)::numeric, 3) AS peso_medio_kg,
    ROUND(AVG(SUM(ma.pct)) OVER (ORDER BY s.s)::numeric, 3) AS mortalidade_acum_pct,
    v_amostra AS amostra
  FROM semanas s
  LEFT JOIN pesagens_agg pa ON pa.semana = s.s
  LEFT JOIN mort_agg ma ON ma.semana = s.s
  GROUP BY s.s
  ORDER BY s.s;
END;
$$;
