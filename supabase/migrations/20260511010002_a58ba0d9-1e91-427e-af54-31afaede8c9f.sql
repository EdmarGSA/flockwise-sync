
-- 1. Novo enum para modo de operação
DO $$ BEGIN
  CREATE TYPE public.modo_protecao_offline AS ENUM ('temperatura', 'horario', 'hibrido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.origem_setpoint_offline AS ENUM ('curva', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Adiciona colunas
ALTER TABLE public.timers_seguranca_iot
  ADD COLUMN IF NOT EXISTS canal_id uuid REFERENCES public.canais_dispositivo(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS modo public.modo_protecao_offline NOT NULL DEFAULT 'horario',
  ADD COLUMN IF NOT EXISTS temp_liga_c numeric(5,2),
  ADD COLUMN IF NOT EXISTS temp_desliga_c numeric(5,2),
  ADD COLUMN IF NOT EXISTS umidade_max_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS janela_horaria_inicio time,
  ADD COLUMN IF NOT EXISTS janela_horaria_fim time,
  ADD COLUMN IF NOT EXISTS origem_setpoint public.origem_setpoint_offline NOT NULL DEFAULT 'curva',
  ADD COLUMN IF NOT EXISTS setpoint_editado_em timestamptz,
  ADD COLUMN IF NOT EXISTS setpoint_editado_por uuid;

CREATE INDEX IF NOT EXISTS idx_timers_seguranca_canal ON public.timers_seguranca_iot(canal_id);
