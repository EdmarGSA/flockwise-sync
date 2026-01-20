-- 1. Adicionar colunas de controle de carência sanitária em estoque_ovos
ALTER TABLE public.estoque_ovos 
ADD COLUMN IF NOT EXISTS bloqueado_carencia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tratamento_lote_id uuid REFERENCES tratamentos_lote(id),
ADD COLUMN IF NOT EXISTS data_liberacao_carencia date;

-- 2. Criar tabela de configuração de custos de postura
CREATE TABLE IF NOT EXISTS public.config_custo_postura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  custo_ave_dia numeric DEFAULT 0.15,
  custo_mao_obra_dia numeric DEFAULT 0,
  outros_custos_dia numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(integrado_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.config_custo_postura ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para config_custo_postura
CREATE POLICY "Users can view own config_custo_postura"
ON public.config_custo_postura
FOR SELECT
USING (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can insert own config_custo_postura"
ON public.config_custo_postura
FOR INSERT
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update own config_custo_postura"
ON public.config_custo_postura
FOR UPDATE
USING (integrado_id = get_my_integrado_id());

-- 5. Trigger para updated_at
CREATE TRIGGER update_config_custo_postura_updated_at
BEFORE UPDATE ON public.config_custo_postura
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Índice para busca de ovos bloqueados
CREATE INDEX IF NOT EXISTS idx_estoque_ovos_bloqueado_carencia 
ON public.estoque_ovos (integrado_id, bloqueado_carencia) 
WHERE bloqueado_carencia = true;

-- 7. Comentários para documentação
COMMENT ON COLUMN public.estoque_ovos.bloqueado_carencia IS 'Indica se ovos estão bloqueados por período de carência de tratamento';
COMMENT ON COLUMN public.estoque_ovos.data_liberacao_carencia IS 'Data em que os ovos serão liberados para venda após período de carência';
COMMENT ON TABLE public.config_custo_postura IS 'Configurações para cálculo de custo de produção de ovos';