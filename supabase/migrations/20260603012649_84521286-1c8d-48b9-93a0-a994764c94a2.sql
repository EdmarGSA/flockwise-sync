
-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.plano_codigo AS ENUM ('starter','profissional','integradora','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assinatura_status AS ENUM ('trial','ativa','atrasada','cancelada','suspensa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ciclo_cobranca AS ENUM ('mensal','anual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 1) PLANOS (catálogo)
-- =====================================================
CREATE TABLE public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo plano_codigo NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco_base_brl numeric(10,2) NOT NULL DEFAULT 0,
  preco_galpao_adicional_brl numeric(10,2) NOT NULL DEFAULT 0,
  setup_fee_brl numeric(10,2) NOT NULL DEFAULT 0,
  limite_galpoes integer,           -- NULL = ilimitado
  limite_usuarios integer,          -- NULL = ilimitado
  inclui_iot boolean NOT NULL DEFAULT false,
  inclui_financeiro boolean NOT NULL DEFAULT false,
  inclui_veterinario boolean NOT NULL DEFAULT false,
  inclui_erp_sync boolean NOT NULL DEFAULT false,
  inclui_multi_nucleos boolean NOT NULL DEFAULT false,
  publico boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos públicos visíveis a autenticados" ON public.planos
  FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "Superadmin gerencia planos" ON public.planos
  FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2) PLANOS_ADDONS (catálogo de add-ons)
-- =====================================================
CREATE TABLE public.planos_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,         -- ex.: 'ia_insights', 'ia_ilimitado', 'cameras_dvr'
  nome text NOT NULL,
  descricao text,
  preco_brl numeric(10,2) NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'mes', -- 'mes', 'galpao_mes', 'lote_mes', 'fornecedor_mes'
  preco_excedente_brl numeric(10,2),   -- valor por unidade extra após cota
  cota_inclusa integer,                -- ex.: 10 lotes inclusos no IA Insights
  categoria text NOT NULL DEFAULT 'ia',-- 'ia' | 'integracao' | 'hardware' | 'portal'
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos_addons TO authenticated;
GRANT ALL ON public.planos_addons TO service_role;
ALTER TABLE public.planos_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Addons visíveis a autenticados" ON public.planos_addons
  FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "Superadmin gerencia addons" ON public.planos_addons
  FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE TRIGGER trg_planos_addons_updated BEFORE UPDATE ON public.planos_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3) ASSINATURAS
-- =====================================================
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL UNIQUE,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  ciclo ciclo_cobranca NOT NULL DEFAULT 'mensal',
  status assinatura_status NOT NULL DEFAULT 'trial',
  galpoes_contratados integer NOT NULL DEFAULT 0, -- além dos inclusos no base
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  trial_termina_em timestamptz,
  vence_em timestamptz,
  cancelada_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assinaturas_integrado ON public.assinaturas(integrado_id);
CREATE INDEX idx_assinaturas_status ON public.assinaturas(status);

GRANT SELECT ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org vê sua assinatura" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());
CREATE POLICY "Superadmin gerencia assinaturas" ON public.assinaturas
  FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

CREATE TRIGGER trg_assinaturas_updated BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4) ASSINATURAS_ADDONS
-- =====================================================
CREATE TABLE public.assinaturas_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.planos_addons(id),
  quantidade integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  cancelado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assinatura_id, addon_id)
);

CREATE INDEX idx_assinaturas_addons_assinatura ON public.assinaturas_addons(assinatura_id);

GRANT SELECT ON public.assinaturas_addons TO authenticated;
GRANT ALL ON public.assinaturas_addons TO service_role;
ALTER TABLE public.assinaturas_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org vê seus addons" ON public.assinaturas_addons
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assinaturas a
    WHERE a.id = assinatura_id
      AND (a.integrado_id = public.get_my_integrado_id() OR public.is_superadmin())
  ));
CREATE POLICY "Superadmin gerencia addons assinatura" ON public.assinaturas_addons
  FOR ALL TO authenticated USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- =====================================================
-- 5) AI_USAGE_LOG
-- =====================================================
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  user_id uuid,
  funcao text NOT NULL,         -- 'relatorio-lote-diario', 'climate-learn', etc.
  modelo text NOT NULL,         -- 'google/gemini-2.5-pro', etc.
  lote_id uuid,
  galpao_id uuid,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  custo_estimado_usd numeric(10,6) NOT NULL DEFAULT 0,
  custo_estimado_brl numeric(10,4) NOT NULL DEFAULT 0,
  cached boolean NOT NULL DEFAULT false,
  sucesso boolean NOT NULL DEFAULT true,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_integrado_data ON public.ai_usage_log(integrado_id, created_at DESC);
CREATE INDEX idx_ai_usage_funcao ON public.ai_usage_log(funcao, created_at DESC);

GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org vê seu uso de IA" ON public.ai_usage_log
  FOR SELECT TO authenticated
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());
-- Inserts apenas via service_role (edge functions). Sem policy de INSERT para authenticated.

-- =====================================================
-- 6) HELPER: org tem addon ativo?
-- =====================================================
CREATE OR REPLACE FUNCTION public.org_tem_addon(_integrado_id uuid, _codigo_addon text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assinaturas a
    JOIN public.assinaturas_addons aa ON aa.assinatura_id = a.id
    JOIN public.planos_addons pa ON pa.id = aa.addon_id
    WHERE a.integrado_id = _integrado_id
      AND a.status IN ('trial','ativa')
      AND aa.ativo = true
      AND pa.codigo = _codigo_addon
      AND pa.ativo = true
  )
$$;

-- =====================================================
-- 7) SEED — Planos e Add-ons
-- =====================================================
INSERT INTO public.planos (codigo, nome, descricao, preco_base_brl, preco_galpao_adicional_brl, setup_fee_brl, limite_galpoes, limite_usuarios, inclui_iot, inclui_financeiro, inclui_veterinario, inclui_erp_sync, inclui_multi_nucleos, ordem) VALUES
  ('starter',      'Starter',      'Manejo essencial de lotes para pequenas granjas',                       290.00, 35.00, 1500.00, 4,    2,    false, false, false, false, false, 1),
  ('profissional', 'Profissional', 'IoT + automação climática + financeiro + veterinário',                  690.00, 45.00, 3500.00, 20,   10,   true,  true,  true,  false, false, 2),
  ('integradora',  'Integradora',  'Multi-núcleos, mapa de risco, Cockpit Thoth, ERP sync, usuários ilimitados', 1490.00, 38.00, 8900.00, NULL, NULL, true,  true,  true,  true,  true,  3),
  ('enterprise',   'Enterprise',   'White-label, SSO/SAML, SLA dedicado, customizações',                    0.00,   0.00,  0.00,    NULL, NULL, true,  true,  true,  true,  true,  4)
ON CONFLICT (codigo) DO NOTHING;

UPDATE public.planos SET publico = false WHERE codigo = 'enterprise';

INSERT INTO public.planos_addons (codigo, nome, descricao, preco_brl, unidade, preco_excedente_brl, cota_inclusa, categoria, ordem) VALUES
  ('ia_insights',     'IA Insights',          'Relatório diário com análise IA, narrativa Climate Brain e briefing de mortalidade', 149.00, 'mes', 9.00, 10, 'ia', 1),
  ('ia_ilimitado',    'IA Insights Ilimitado','IA sem cota — recomendado p/ integradoras com 50+ lotes',                            490.00, 'mes', NULL, NULL, 'ia', 2),
  ('cameras_dvr',     'Câmeras Intelbras DVR','Snapshots em tempo real via DDNS por galpão',                                         39.00, 'galpao_mes', NULL, NULL, 'hardware', 3),
  ('portal_fornecedor','Portal Fornecedor B2B','Mini-ERP, vitrine e ERP sync para fornecedor parceiro',                              390.00, 'fornecedor_mes', NULL, NULL, 'portal', 4),
  ('erp_custom',      'Integração ERP customizada','Conector ERP sob medida (setup R$ 4.500 + mensalidade)',                        290.00, 'mes', NULL, NULL, 'integracao', 5)
ON CONFLICT (codigo) DO NOTHING;
