
-- 1. Colunas em canais_dispositivo
ALTER TABLE public.canais_dispositivo
  ADD COLUMN IF NOT EXISTS ultimo_estado_persistido text,
  ADD COLUMN IF NOT EXISTS ultimo_estado_persistido_em timestamptz,
  ADD COLUMN IF NOT EXISTS recuperacao_apos_falha boolean NOT NULL DEFAULT false;

-- 2. Colunas em dispositivos_iot
ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS ultima_inicializacao timestamptz,
  ADD COLUMN IF NOT EXISTS boot_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_boot_reason text,
  ADD COLUMN IF NOT EXISTS programa_versao text;

-- 3. Tabela de eventos
CREATE TABLE IF NOT EXISTS public.eventos_dispositivo_iot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('boot','offline','online','reconciliacao','recuperacao_local')),
  detalhes jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_disp_iot_disp ON public.eventos_dispositivo_iot(dispositivo_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_disp_iot_integ ON public.eventos_dispositivo_iot(integrado_id, criado_em DESC);

ALTER TABLE public.eventos_dispositivo_iot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_disp_select_own_org"
  ON public.eventos_dispositivo_iot FOR SELECT
  USING (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

CREATE POLICY "eventos_disp_insert_service"
  ON public.eventos_dispositivo_iot FOR INSERT
  WITH CHECK (integrado_id = public.get_my_integrado_id() OR public.is_superadmin());

-- 4. Função: marcar offline + gerar eventos
CREATE OR REPLACE FUNCTION public.marcar_dispositivos_offline_iot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_dev RECORD;
BEGIN
  -- Dispositivos que estavam online e não enviam telemetria há > 10 min
  FOR v_dev IN
    SELECT id, integrado_id, nome, ultimo_sync
    FROM public.dispositivos_iot
    WHERE ativo = true
      AND online = true
      AND (ultimo_sync IS NULL OR ultimo_sync < now() - INTERVAL '10 minutes')
  LOOP
    UPDATE public.dispositivos_iot SET online = false WHERE id = v_dev.id;
    INSERT INTO public.eventos_dispositivo_iot (dispositivo_id, integrado_id, tipo, detalhes)
    VALUES (v_dev.id, v_dev.integrado_id, 'offline',
      jsonb_build_object('ultimo_sync', v_dev.ultimo_sync, 'nome', v_dev.nome));
    v_count := v_count + 1;

    -- Marca canais para reconciliação assim que voltar
    UPDATE public.canais_dispositivo
       SET recuperacao_apos_falha = true
     WHERE dispositivo_id = v_dev.id AND ativo = true;
  END LOOP;

  RETURN v_count;
END;
$$;
