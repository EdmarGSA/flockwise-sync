ALTER TABLE public.nucleo_alertas_config
  ADD COLUMN IF NOT EXISTS habilitar_sensor_suspeito boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sensor_offline_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sensor_estagnado_min integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ur_suspeita_baixa_pct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ur_suspeita_alta_pct integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ur_divergencia_pp integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS divergencia_temp_c numeric NOT NULL DEFAULT 5;