
-- Brain AI Iluminação: tabela de overrides diários gerados pelo Brain
CREATE TABLE public.override_iluminacao_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE,
  data_ref DATE NOT NULL DEFAULT CURRENT_DATE,
  horas_luz NUMERIC(4,2) NOT NULL,
  acender_hhmm TEXT NOT NULL,
  apagar_hhmm TEXT NOT NULL,
  intensidade_pct INTEGER NOT NULL DEFAULT 80 CHECK (intensidade_pct BETWEEN 0 AND 100),
  blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ramp_up_min INTEGER NOT NULL DEFAULT 20,
  ramp_down_min INTEGER NOT NULL DEFAULT 20,
  motivo TEXT NOT NULL,
  score_confianca NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','expirado','substituido','cancelado')),
  origem TEXT NOT NULL DEFAULT 'brain_auto' CHECK (origem IN ('brain_auto','brain_shadow','manual')),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (galpao_id, data_ref)
);

CREATE INDEX idx_override_iluminacao_brain_galpao ON public.override_iluminacao_brain(galpao_id, data_ref);
CREATE INDEX idx_override_iluminacao_brain_integrado ON public.override_iluminacao_brain(integrado_id);

ALTER TABLE public.override_iluminacao_brain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant pode ver overrides de iluminação brain"
ON public.override_iluminacao_brain FOR SELECT TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "Tenant pode gerenciar overrides de iluminação brain"
ON public.override_iluminacao_brain FOR ALL TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin())
WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE TRIGGER trg_override_iluminacao_brain_updated
BEFORE UPDATE ON public.override_iluminacao_brain
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aprendizado adaptativo por lote
CREATE TABLE public.aprendizado_iluminacao_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  divergencia_peso_pct NUMERIC(6,2),
  horas_luz_aplicadas_media NUMERIC(4,2),
  ganho_peso_g_dia NUMERIC(6,2),
  ajuste_acumulado_h NUMERIC(4,2) NOT NULL DEFAULT 0,
  amostras INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lote_id)
);

ALTER TABLE public.aprendizado_iluminacao_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant pode ver aprendizado iluminação"
ON public.aprendizado_iluminacao_lote FOR SELECT TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin());

CREATE POLICY "Tenant pode gerenciar aprendizado iluminação"
ON public.aprendizado_iluminacao_lote FOR ALL TO authenticated
USING (integrado_id = get_my_integrado_id() OR is_superadmin())
WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());
