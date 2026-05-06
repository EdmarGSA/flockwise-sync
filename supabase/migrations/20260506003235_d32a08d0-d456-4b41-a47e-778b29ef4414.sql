
-- Wave 3: Ventilation staging
ALTER TABLE public.canais_dispositivo
  ADD COLUMN IF NOT EXISTS suporta_posicionamento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS posicao_atual_pct integer CHECK (posicao_atual_pct BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS public.programa_ventilacao_galpao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  galpao_id uuid NOT NULL UNIQUE,
  modo text NOT NULL DEFAULT 'positiva_simples' CHECK (modo IN ('positiva_simples','negativa_tunel','minima_apenas')),
  estagios jsonb NOT NULL DEFAULT '[]'::jsonb,
  pressao_estatica_alvo_pa numeric,
  velocidade_alvo_ms_min numeric,
  velocidade_alvo_ms_max numeric,
  area_transversal_m2 numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programa_ventilacao_galpao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros visualizam programa ventilacao"
  ON public.programa_ventilacao_galpao FOR SELECT
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "Membros inserem programa ventilacao"
  ON public.programa_ventilacao_galpao FOR INSERT
  WITH CHECK (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE POLICY "Membros atualizam programa ventilacao"
  ON public.programa_ventilacao_galpao FOR UPDATE
  USING (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE POLICY "Membros excluem programa ventilacao"
  ON public.programa_ventilacao_galpao FOR DELETE
  USING (integrado_id = get_my_integrado_id() AND can_modify_data());

CREATE TRIGGER trg_programa_ventilacao_updated_at
  BEFORE UPDATE ON public.programa_ventilacao_galpao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.estagio_ventilacao_estado (
  galpao_id uuid PRIMARY KEY,
  integrado_id uuid NOT NULL,
  estagio_atual text NOT NULL DEFAULT 'min',
  velocidade_estimada_ms numeric,
  cfm_total_ativo numeric,
  pressao_estatica_pa numeric,
  ultima_transicao_em timestamptz NOT NULL DEFAULT now(),
  permanencia_minima_seg integer NOT NULL DEFAULT 180,
  reason jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estagio_ventilacao_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros visualizam estado ventilacao"
  ON public.estagio_ventilacao_estado FOR SELECT
  USING (integrado_id = get_my_integrado_id());

CREATE POLICY "Membros gerenciam estado ventilacao"
  ON public.estagio_ventilacao_estado FOR ALL
  USING (integrado_id = get_my_integrado_id())
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE TRIGGER trg_estagio_ventilacao_updated_at
  BEFORE UPDATE ON public.estagio_ventilacao_estado
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
