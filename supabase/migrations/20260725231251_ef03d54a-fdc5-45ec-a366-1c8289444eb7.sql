
ALTER TABLE public.fechamento_lotes
  ADD COLUMN IF NOT EXISTS hora_media_abate time,
  ADD COLUMN IF NOT EXISTS peso_recebido_kg numeric,
  ADD COLUMN IF NOT EXISTS tipo_produto text,
  ADD COLUMN IF NOT EXISTS abatedouro text,
  ADD COLUMN IF NOT EXISTS lote_integradora text,
  ADD COLUMN IF NOT EXISTS tecnico_responsavel text,
  ADD COLUMN IF NOT EXISTS conversao_prevista numeric,
  ADD COLUMN IF NOT EXISTS pc_condenacao_previsto numeric,
  ADD COLUMN IF NOT EXISTS pc_condenacao_real numeric,
  ADD COLUMN IF NOT EXISTS pc_calo_pata_previsto numeric,
  ADD COLUMN IF NOT EXISTS pc_calo_pata_real numeric,
  ADD COLUMN IF NOT EXISTS mortalidade_prevista numeric,
  ADD COLUMN IF NOT EXISTS patas_condenadas integer,
  ADD COLUMN IF NOT EXISTS preco_kg_frango numeric(14,4),
  ADD COLUMN IF NOT EXISTS valor_racao numeric(14,4),
  ADD COLUMN IF NOT EXISTS percentual_basico_partilha numeric(14,4),
  ADD COLUMN IF NOT EXISTS aval_conversao_pc numeric(14,4),
  ADD COLUMN IF NOT EXISTS aval_condenacao_pc numeric(14,4),
  ADD COLUMN IF NOT EXISTS aval_calo_pata_pc numeric(14,4),
  ADD COLUMN IF NOT EXISTS aval_checklist_pc numeric(14,4),
  ADD COLUMN IF NOT EXISTS resultado_bruto_pc numeric(14,4),
  ADD COLUMN IF NOT EXISTS resultado_bruto_kg numeric(14,4),
  ADD COLUMN IF NOT EXISTS resultado_bruto_valor numeric(14,4),
  ADD COLUMN IF NOT EXISTS resultado_bruto_por_cab numeric(14,4),
  ADD COLUMN IF NOT EXISTS valor_renda_bruta numeric(14,4),
  ADD COLUMN IF NOT EXISTS valor_nf numeric(14,4),
  ADD COLUMN IF NOT EXISTS valor_total_depositar numeric(14,4);

CREATE OR REPLACE FUNCTION public.fechamento_pertence_org(_fechamento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fechamento_lotes f
    WHERE f.id = _fechamento_id
      AND f.integrado_id = public.get_my_integrado_id()
  )
$$;

CREATE TABLE IF NOT EXISTS public.fechamento_cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.fechamento_lotes(id) ON DELETE CASCADE,
  abatedouro text,
  data_abate date,
  quantidade integer NOT NULL DEFAULT 0,
  peso_total_kg numeric NOT NULL DEFAULT 0,
  peso_medio_kg numeric,
  nota_produtor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fechamento_condenacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.fechamento_lotes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'FT',
  codigo text,
  descricao text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  percentual numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fechamento_descontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.fechamento_lotes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  debito numeric(14,2) NOT NULL DEFAULT 0,
  credito numeric(14,2) NOT NULL DEFAULT 0,
  valor_por_cab numeric(14,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fechamento_origem_pintos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.fechamento_lotes(id) ON DELETE CASCADE,
  lote_matriz text,
  idade_matriz integer,
  linhagem text,
  incubatorio text,
  peso_pinto_kg numeric,
  quantidade_alojada integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamento_cargas TO authenticated;
GRANT ALL ON public.fechamento_cargas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamento_condenacoes TO authenticated;
GRANT ALL ON public.fechamento_condenacoes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamento_descontos TO authenticated;
GRANT ALL ON public.fechamento_descontos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamento_origem_pintos TO authenticated;
GRANT ALL ON public.fechamento_origem_pintos TO service_role;

ALTER TABLE public.fechamento_cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_condenacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_descontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamento_origem_pintos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org can manage fechamento_cargas" ON public.fechamento_cargas
  FOR ALL TO authenticated
  USING (public.fechamento_pertence_org(fechamento_id))
  WITH CHECK (public.fechamento_pertence_org(fechamento_id));

CREATE POLICY "Org can manage fechamento_condenacoes" ON public.fechamento_condenacoes
  FOR ALL TO authenticated
  USING (public.fechamento_pertence_org(fechamento_id))
  WITH CHECK (public.fechamento_pertence_org(fechamento_id));

CREATE POLICY "Org can manage fechamento_descontos" ON public.fechamento_descontos
  FOR ALL TO authenticated
  USING (public.fechamento_pertence_org(fechamento_id))
  WITH CHECK (public.fechamento_pertence_org(fechamento_id));

CREATE POLICY "Org can manage fechamento_origem_pintos" ON public.fechamento_origem_pintos
  FOR ALL TO authenticated
  USING (public.fechamento_pertence_org(fechamento_id))
  WITH CHECK (public.fechamento_pertence_org(fechamento_id));

CREATE TRIGGER trg_fechamento_cargas_updated BEFORE UPDATE ON public.fechamento_cargas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fechamento_condenacoes_updated BEFORE UPDATE ON public.fechamento_condenacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fechamento_descontos_updated BEFORE UPDATE ON public.fechamento_descontos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fechamento_origem_pintos_updated BEFORE UPDATE ON public.fechamento_origem_pintos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_fechamento_cargas_fid ON public.fechamento_cargas(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_condenacoes_fid ON public.fechamento_condenacoes(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_descontos_fid ON public.fechamento_descontos(fechamento_id);
CREATE INDEX IF NOT EXISTS idx_fechamento_origem_pintos_fid ON public.fechamento_origem_pintos(fechamento_id);
