
-- Enum for device automation function
CREATE TYPE public.funcao_automacao AS ENUM ('aquecimento', 'ventilacao', 'nenhuma');

-- Add automation columns to dispositivos_iot
ALTER TABLE public.dispositivos_iot 
  ADD COLUMN funcao_automacao public.funcao_automacao NOT NULL DEFAULT 'nenhuma',
  ADD COLUMN automacao_ativa boolean NOT NULL DEFAULT false;

-- Temperature rules table
CREATE TABLE public.regras_temperatura_lote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  nome text NOT NULL DEFAULT 'Padrão',
  dia_inicio integer NOT NULL,
  dia_fim integer NOT NULL,
  temp_min_c numeric NOT NULL,
  temp_max_c numeric NOT NULL,
  umidade_min_pct numeric,
  umidade_max_pct numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regras_temperatura_lote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own regras_temperatura" ON public.regras_temperatura_lote
  FOR ALL TO authenticated
  USING (integrado_id = public.get_my_integrado_id())
  WITH CHECK (integrado_id = public.get_my_integrado_id());

-- Automation log table
CREATE TABLE public.log_automacao_temperatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE NOT NULL,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  temperatura_lida numeric,
  temp_min_regra numeric,
  temp_max_regra numeric,
  acao text NOT NULL,
  resultado text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.log_automacao_temperatura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation logs" ON public.log_automacao_temperatura
  FOR SELECT TO authenticated
  USING (
    dispositivo_id IN (
      SELECT id FROM public.dispositivos_iot WHERE integrado_id = public.get_my_integrado_id()
    )
  );
