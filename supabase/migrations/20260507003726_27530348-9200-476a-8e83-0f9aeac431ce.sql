-- Programa de cortina inteligente por galpão
CREATE TABLE IF NOT EXISTS public.programa_cortina_inteligente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  programa_ventilacao_id uuid REFERENCES public.programa_ventilacao_galpao(id) ON DELETE SET NULL,
  modo text NOT NULL DEFAULT 'hibrido',
  posicao_min_pct int NOT NULL DEFAULT 0 CHECK (posicao_min_pct BETWEEN 0 AND 100),
  posicao_max_pct int NOT NULL DEFAULT 100 CHECK (posicao_max_pct BETWEEN 0 AND 100),
  velocidade_abertura_pct_min int NOT NULL DEFAULT 10,
  velocidade_fechamento_pct_min int NOT NULL DEFAULT 5,
  offset_estagio_min_pct int NOT NULL DEFAULT 10,
  offset_estagio_transicao_pct int NOT NULL DEFAULT 40,
  offset_estagio_tunel_pct int NOT NULL DEFAULT 100,
  offset_estagio_heat_stress_pct int NOT NULL DEFAULT 100,
  considerar_vento_externo boolean NOT NULL DEFAULT true,
  vento_externo_max_ms numeric DEFAULT 8.0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (galpao_id)
);

ALTER TABLE public.programa_cortina_inteligente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view cortina programs" ON public.programa_cortina_inteligente
  FOR SELECT USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "Org members insert cortina programs" ON public.programa_cortina_inteligente
  FOR INSERT WITH CHECK (integrado_id = get_my_integrado_id() AND can_modify_data());
CREATE POLICY "Org members update cortina programs" ON public.programa_cortina_inteligente
  FOR UPDATE USING (integrado_id = get_my_integrado_id() AND can_modify_data());
CREATE POLICY "Org members delete cortina programs" ON public.programa_cortina_inteligente
  FOR DELETE USING (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE TRIGGER set_updated_at_programa_cortina
  BEFORE UPDATE ON public.programa_cortina_inteligente
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Estado em tempo real da cortina
CREATE TABLE IF NOT EXISTS public.cortina_estado_atual (
  galpao_id uuid PRIMARY KEY REFERENCES public.galpoes(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  posicao_atual_pct int CHECK (posicao_atual_pct BETWEEN 0 AND 100),
  posicao_alvo_pct int CHECK (posicao_alvo_pct BETWEEN 0 AND 100),
  ultima_movimentacao_em timestamptz,
  ultimo_motivo text,
  reason_chain jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cortina_estado_atual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view cortina state" ON public.cortina_estado_atual
  FOR SELECT USING (integrado_id = get_my_integrado_id() OR is_superadmin());
CREATE POLICY "System manages cortina state" ON public.cortina_estado_atual
  FOR ALL USING (integrado_id = get_my_integrado_id() OR is_superadmin())
  WITH CHECK (integrado_id = get_my_integrado_id() OR is_superadmin());

-- Faixa por idade na regra de temperatura
ALTER TABLE public.regras_temperatura_lote
  ADD COLUMN IF NOT EXISTS cortina_pos_min_pct int CHECK (cortina_pos_min_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cortina_pos_max_pct int CHECK (cortina_pos_max_pct BETWEEN 0 AND 100);