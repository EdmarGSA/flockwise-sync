
-- 1) Adicionar coordenadas GPS aos galpões
ALTER TABLE public.galpoes
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2) Tabela de configuração do Mapbox por integrado
CREATE TABLE IF NOT EXISTS public.mapbox_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL UNIQUE,
  public_token text NOT NULL,
  default_lat double precision,
  default_lng double precision,
  default_zoom integer DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mapbox_config ENABLE ROW LEVEL SECURITY;

-- Policies: usuários só veem/editam o token da própria organização
CREATE POLICY "mapbox_config_select_own_org"
  ON public.mapbox_config FOR SELECT
  TO authenticated
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "mapbox_config_insert_own_org"
  ON public.mapbox_config FOR INSERT
  TO authenticated
  WITH CHECK (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "mapbox_config_update_own_org"
  ON public.mapbox_config FOR UPDATE
  TO authenticated
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin())
  WITH CHECK (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "mapbox_config_delete_own_org"
  ON public.mapbox_config FOR DELETE
  TO authenticated
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_mapbox_config_updated_at ON public.mapbox_config;
CREATE TRIGGER trg_mapbox_config_updated_at
  BEFORE UPDATE ON public.mapbox_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
