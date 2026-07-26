ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS online boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dispositivos_iot_online
  ON public.dispositivos_iot (integrado_id) WHERE online = true;

CREATE OR REPLACE FUNCTION public.marcar_dispositivos_offline_iot()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_dev RECORD;
BEGIN
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

    UPDATE public.canais_dispositivo
       SET recuperacao_apos_falha = true
     WHERE dispositivo_id = v_dev.id AND ativo = true;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;