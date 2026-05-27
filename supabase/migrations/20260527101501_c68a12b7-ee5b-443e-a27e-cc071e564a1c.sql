
ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS tipo_dispositivo text DEFAULT 'controlador',
  ADD COLUMN IF NOT EXISTS sensor_modelo text,
  ADD COLUMN IF NOT EXISTS modbus_slave_id integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS modbus_baud integer DEFAULT 9600,
  ADD COLUMN IF NOT EXISTS sensor_serial text,
  ADD COLUMN IF NOT EXISTS sensor_wifi_token text,
  ADD COLUMN IF NOT EXISTS sensor_ultimo_erro text,
  ADD COLUMN IF NOT EXISTS sensor_ultimo_erro_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_dispositivos_iot_sensor_token
  ON public.dispositivos_iot(sensor_wifi_token)
  WHERE sensor_wifi_token IS NOT NULL;

ALTER TABLE public.leituras_sensores
  ADD COLUMN IF NOT EXISTS fonte text DEFAULT 'esp32_interno';

CREATE INDEX IF NOT EXISTS idx_leituras_sensores_disp_fonte_data
  ON public.leituras_sensores(dispositivo_id, fonte, created_at DESC);

INSERT INTO public.tipos_evento_notificacao (codigo, nome, severidade_padrao, roles_padrao, ativo)
VALUES
  ('sensor_wifi_offline', 'Sensor Wi-Fi offline', 'warning',
   ARRAY['admin','criador','veterinario']::app_role[], true),
  ('sensor_modbus_falha', 'Falha Modbus no sensor RS485', 'warning',
   ARRAY['admin','criador']::app_role[], true),
  ('sensor_fallback_ativado', 'Fallback RS485 ativado para sensor', 'info',
   ARRAY['admin','criador']::app_role[], true)
ON CONFLICT (codigo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.registrar_leitura_sensor_unificada(
  p_dispositivo_id uuid,
  p_temperatura numeric,
  p_umidade numeric,
  p_fonte text,
  p_raw jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev RECORD;
  v_ultima_wifi timestamptz;
  v_leitura_id uuid;
BEGIN
  SELECT id, integrado_id, galpao_id INTO v_dev
    FROM dispositivos_iot WHERE id = p_dispositivo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispositivo não encontrado'; END IF;

  IF p_fonte = 'rs485_bridge' THEN
    SELECT MAX(created_at) INTO v_ultima_wifi
      FROM leituras_sensores
      WHERE dispositivo_id = p_dispositivo_id
        AND fonte = 'wifi_sensor'
        AND created_at > now() - INTERVAL '5 minutes';
    IF v_ultima_wifi IS NOT NULL THEN
      RETURN NULL; -- Wi-Fi primária ainda fresca, descarta fallback
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM eventos_dispositivo_iot
      WHERE dispositivo_id = p_dispositivo_id
        AND tipo = 'sensor_fallback_ativado'
        AND criado_em > now() - INTERVAL '1 hour'
    ) THEN
      INSERT INTO eventos_dispositivo_iot (dispositivo_id, integrado_id, tipo, detalhes)
      VALUES (p_dispositivo_id, v_dev.integrado_id, 'sensor_fallback_ativado',
        jsonb_build_object('temp', p_temperatura, 'umid', p_umidade));
      PERFORM dispatch_notificacao('sensor_fallback_ativado', v_dev.integrado_id,
        'Sensor usando fallback RS485',
        'O sensor Wi-Fi parou de responder. Leitura via ESP32 RS485 está sendo usada.',
        jsonb_build_object('dispositivo_id', p_dispositivo_id));
    END IF;
  END IF;

  INSERT INTO leituras_sensores (dispositivo_id, temperatura_c, umidade_pct,
    online, fonte, raw_data, lido_em)
  VALUES (p_dispositivo_id, p_temperatura, p_umidade, true, p_fonte, p_raw, now())
  RETURNING id INTO v_leitura_id;

  UPDATE dispositivos_iot SET ultimo_sync = now() WHERE id = p_dispositivo_id;

  RETURN v_leitura_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_leitura_sensor_unificada(uuid,numeric,numeric,text,jsonb) TO service_role;
