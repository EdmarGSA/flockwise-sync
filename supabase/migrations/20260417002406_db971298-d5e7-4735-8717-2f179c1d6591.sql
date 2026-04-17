-- 1. Enums para os novos campos
DO $$ BEGIN
  CREATE TYPE public.driver_iot AS ENUM ('ewelink', 'esp32_mqtt', 'esp32_http');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_equipamento_canal AS ENUM (
    'ventilador',
    'nebulizador',
    'iluminacao',
    'aquecimento',
    'cortina',
    'alarme',
    'exaustor',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Adicionar colunas na tabela dispositivos_iot
ALTER TABLE public.dispositivos_iot
  ADD COLUMN IF NOT EXISTS driver public.driver_iot NOT NULL DEFAULT 'ewelink',
  ADD COLUMN IF NOT EXISTS endpoint_local text,
  ADD COLUMN IF NOT EXISTS auth_token text,
  ADD COLUMN IF NOT EXISTS num_canais integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_dispositivos_iot_driver
  ON public.dispositivos_iot(driver);

-- 3. Tabela canais_dispositivo
CREATE TABLE IF NOT EXISTS public.canais_dispositivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.dispositivos_iot(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  canal_numero integer NOT NULL,
  nome text NOT NULL,
  tipo_equipamento public.tipo_equipamento_canal NOT NULL DEFAULT 'outro',
  funcao_automacao public.funcao_automacao NOT NULL DEFAULT 'nenhuma',
  automacao_ativa boolean NOT NULL DEFAULT false,
  estado_atual text,
  ultimo_comando_em timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispositivo_id, canal_numero)
);

CREATE INDEX IF NOT EXISTS idx_canais_dispositivo_dispositivo
  ON public.canais_dispositivo(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_canais_dispositivo_integrado
  ON public.canais_dispositivo(integrado_id);
CREATE INDEX IF NOT EXISTS idx_canais_dispositivo_tipo
  ON public.canais_dispositivo(tipo_equipamento);

ALTER TABLE public.canais_dispositivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da org podem visualizar canais"
  ON public.canais_dispositivo FOR SELECT
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Membros da org podem inserir canais"
  ON public.canais_dispositivo FOR INSERT
  WITH CHECK (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE POLICY "Membros da org podem atualizar canais"
  ON public.canais_dispositivo FOR UPDATE
  USING (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE POLICY "Membros da org podem excluir canais"
  ON public.canais_dispositivo FOR DELETE
  USING (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE TRIGGER trg_canais_dispositivo_updated_at
  BEFORE UPDATE ON public.canais_dispositivo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tabela regras_automacao_avancada (regras compostas)
CREATE TABLE IF NOT EXISTS public.regras_automacao_avancada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  prioridade integer NOT NULL DEFAULT 100,
  -- Escopo: aplicar em galpão específico ou geral por idade
  galpao_id uuid REFERENCES public.galpoes(id) ON DELETE CASCADE,
  dia_inicio integer,
  dia_fim integer,
  -- Condições (todas opcionais; AND lógico)
  temp_min_c numeric,
  temp_max_c numeric,
  umidade_min_pct numeric,
  umidade_max_pct numeric,
  hora_inicio time,
  hora_fim time,
  -- Ação: ligar/desligar canal alvo
  canal_alvo_id uuid REFERENCES public.canais_dispositivo(id) ON DELETE CASCADE,
  acao text NOT NULL DEFAULT 'ligar' CHECK (acao IN ('ligar', 'desligar')),
  duracao_minutos integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regras_avancadas_integrado
  ON public.regras_automacao_avancada(integrado_id);
CREATE INDEX IF NOT EXISTS idx_regras_avancadas_galpao
  ON public.regras_automacao_avancada(galpao_id);
CREATE INDEX IF NOT EXISTS idx_regras_avancadas_canal
  ON public.regras_automacao_avancada(canal_alvo_id);

ALTER TABLE public.regras_automacao_avancada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da org podem visualizar regras avançadas"
  ON public.regras_automacao_avancada FOR SELECT
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Membros da org podem inserir regras avançadas"
  ON public.regras_automacao_avancada FOR INSERT
  WITH CHECK (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE POLICY "Membros da org podem atualizar regras avançadas"
  ON public.regras_automacao_avancada FOR UPDATE
  USING (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE POLICY "Membros da org podem excluir regras avançadas"
  ON public.regras_automacao_avancada FOR DELETE
  USING (integrado_id = public.get_my_integrado_id() AND public.can_modify_data());

CREATE TRIGGER trg_regras_avancadas_updated_at
  BEFORE UPDATE ON public.regras_automacao_avancada
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Backfill: criar 1 canal default para cada dispositivo existente (compatibilidade Sonoff)
INSERT INTO public.canais_dispositivo (
  dispositivo_id, integrado_id, canal_numero, nome,
  tipo_equipamento, funcao_automacao, automacao_ativa, ativo
)
SELECT 
  d.id,
  d.integrado_id,
  1,
  d.nome,
  CASE d.funcao_automacao
    WHEN 'aquecimento' THEN 'aquecimento'::public.tipo_equipamento_canal
    WHEN 'ventilacao' THEN 'ventilador'::public.tipo_equipamento_canal
    ELSE 'outro'::public.tipo_equipamento_canal
  END,
  d.funcao_automacao,
  d.automacao_ativa,
  true
FROM public.dispositivos_iot d
WHERE NOT EXISTS (
  SELECT 1 FROM public.canais_dispositivo c WHERE c.dispositivo_id = d.id
);