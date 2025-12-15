-- =====================================================
-- FASE 1: SUPORTE A AVES DE POSTURA
-- =====================================================

-- 1. Criar ENUMs para Postura
-- -----------------------------------------------------

-- Enum para linhagens de postura
CREATE TYPE linhagem_postura AS ENUM (
  'lohmann_brown_lite',
  'lohmann_lsl_lite',
  'hy_line_brown',
  'hy_line_w36',
  'isa_brown',
  'novogen_brown',
  'dekalb_white'
);

-- Enum para fases de postura
CREATE TYPE fase_postura AS ENUM (
  'cria',       -- 0-6 semanas
  'recria',     -- 7-18 semanas
  'producao'    -- 19-80+ semanas
);

-- Enum para classificação de ovos (Padrão 2025)
CREATE TYPE classificacao_ovo AS ENUM (
  'medio',      -- M: 38g a 47,99g
  'grande',     -- G: 48g a 57,99g
  'extra',      -- EG: 58g a 67,99g
  'jumbo'       -- J: Acima de 68g
);

-- 2. Tabela desempenho_postura (Dados de Referência)
-- -----------------------------------------------------
CREATE TABLE public.desempenho_postura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linhagem linhagem_postura NOT NULL,
  semana INTEGER NOT NULL,
  fase fase_postura NOT NULL,
  peso_g NUMERIC NOT NULL,
  consumo_diario_g NUMERIC NOT NULL,
  producao_percentual NUMERIC,
  peso_ovo_g NUMERIC,
  ovos_ave_alojada NUMERIC,
  viabilidade_percentual NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(linhagem, semana)
);

-- Enable RLS
ALTER TABLE public.desempenho_postura ENABLE ROW LEVEL SECURITY;

-- RLS Policies for desempenho_postura (reference data - read by all authenticated)
CREATE POLICY "Authenticated users can view desempenho_postura"
ON public.desempenho_postura
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert desempenho_postura"
ON public.desempenho_postura
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update desempenho_postura"
ON public.desempenho_postura
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Tabela producao_ovos (Registro Diário)
-- -----------------------------------------------------
CREATE TABLE public.producao_ovos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  data_producao DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Produção total
  ovos_totais INTEGER NOT NULL DEFAULT 0,
  ovos_incubaveis INTEGER DEFAULT 0,
  
  -- Perdas/Descarte
  ovos_trincados INTEGER DEFAULT 0,
  ovos_sujos INTEGER DEFAULT 0,
  ovos_quebrados INTEGER DEFAULT 0,
  ovos_deformados INTEGER DEFAULT 0,
  ovos_pequenos INTEGER DEFAULT 0,
  
  -- Classificação por peso (Padrão 2025)
  ovos_medio INTEGER DEFAULT 0,
  ovos_grande INTEGER DEFAULT 0,
  ovos_extra INTEGER DEFAULT 0,
  ovos_jumbo INTEGER DEFAULT 0,
  
  -- Métricas
  peso_medio_ovo_g NUMERIC,
  aves_vivas INTEGER NOT NULL,
  percentual_postura NUMERIC,
  
  -- Observações e auditoria
  observacoes TEXT,
  criado_por UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lote_id, data_producao)
);

-- Enable RLS
ALTER TABLE public.producao_ovos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for producao_ovos
CREATE POLICY "Users can view producao_ovos"
ON public.producao_ovos
FOR SELECT
USING (true);

CREATE POLICY "Users can insert producao_ovos"
ON public.producao_ovos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update producao_ovos"
ON public.producao_ovos
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete producao_ovos"
ON public.producao_ovos
FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_producao_ovos_updated_at
BEFORE UPDATE ON public.producao_ovos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tabela metas_postura (Metas Personalizadas)
-- -----------------------------------------------------
CREATE TABLE public.metas_postura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE UNIQUE,
  integrado_id UUID NOT NULL,
  
  -- Metas de produção
  meta_pico_postura NUMERIC DEFAULT 95,
  semana_pico INTEGER DEFAULT 28,
  meta_persistencia NUMERIC DEFAULT 0.5,
  meta_viabilidade NUMERIC DEFAULT 95,
  
  -- Metas de qualidade
  meta_ovos_incubaveis NUMERIC DEFAULT 85,
  meta_peso_ovo_g NUMERIC DEFAULT 62,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metas_postura ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metas_postura
CREATE POLICY "Users can view metas_postura"
ON public.metas_postura
FOR SELECT
USING (true);

CREATE POLICY "Users can insert metas_postura"
ON public.metas_postura
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update metas_postura"
ON public.metas_postura
FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_metas_postura_updated_at
BEFORE UPDATE ON public.metas_postura
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Alterações na tabela lotes
-- -----------------------------------------------------

-- Adicionar campo para linhagem de postura
ALTER TABLE public.lotes ADD COLUMN linhagem_postura linhagem_postura;

-- Adicionar campo para fase atual de postura
ALTER TABLE public.lotes ADD COLUMN fase_postura_atual fase_postura;

-- 6. Alterações na tabela fechamento_lotes (campos específicos postura)
-- -----------------------------------------------------

ALTER TABLE public.fechamento_lotes ADD COLUMN tipo_producao TEXT;
ALTER TABLE public.fechamento_lotes ADD COLUMN total_ovos_produzidos INTEGER;
ALTER TABLE public.fechamento_lotes ADD COLUMN ovos_por_ave_alojada NUMERIC;
ALTER TABLE public.fechamento_lotes ADD COLUMN percentual_postura_medio NUMERIC;
ALTER TABLE public.fechamento_lotes ADD COLUMN peso_medio_descarte_kg NUMERIC;
ALTER TABLE public.fechamento_lotes ADD COLUMN valor_venda_aves NUMERIC;
ALTER TABLE public.fechamento_lotes ADD COLUMN semanas_producao INTEGER;

-- 7. Função para calcular fase de postura baseada em semanas
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_fase_postura(semanas_vida INTEGER)
RETURNS fase_postura
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN semanas_vida <= 6 THEN 'cria'::fase_postura
    WHEN semanas_vida <= 18 THEN 'recria'::fase_postura
    ELSE 'producao'::fase_postura
  END
$$;