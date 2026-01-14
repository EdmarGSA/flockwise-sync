-- Tabela de metas zootécnicas por organização
CREATE TABLE public.metas_zootecnicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  
  -- Metas de Mortalidade (% acumulado por período)
  mortalidade_7_dias_ok NUMERIC DEFAULT 0.5,
  mortalidade_7_dias_alerta NUMERIC DEFAULT 1.0,
  mortalidade_14_dias_ok NUMERIC DEFAULT 1.0,
  mortalidade_14_dias_alerta NUMERIC DEFAULT 1.8,
  mortalidade_21_dias_ok NUMERIC DEFAULT 1.5,
  mortalidade_21_dias_alerta NUMERIC DEFAULT 2.5,
  mortalidade_28_dias_ok NUMERIC DEFAULT 2.0,
  mortalidade_28_dias_alerta NUMERIC DEFAULT 3.0,
  mortalidade_35_dias_ok NUMERIC DEFAULT 2.5,
  mortalidade_35_dias_alerta NUMERIC DEFAULT 3.5,
  mortalidade_42_dias_ok NUMERIC DEFAULT 3.0,
  mortalidade_42_dias_alerta NUMERIC DEFAULT 4.5,
  
  -- Metas de Conversão Alimentar
  ca_7_dias_ok NUMERIC DEFAULT 1.00,
  ca_7_dias_alerta NUMERIC DEFAULT 1.20,
  ca_14_dias_ok NUMERIC DEFAULT 1.20,
  ca_14_dias_alerta NUMERIC DEFAULT 1.40,
  ca_21_dias_ok NUMERIC DEFAULT 1.35,
  ca_21_dias_alerta NUMERIC DEFAULT 1.55,
  ca_28_dias_ok NUMERIC DEFAULT 1.50,
  ca_28_dias_alerta NUMERIC DEFAULT 1.70,
  ca_35_dias_ok NUMERIC DEFAULT 1.60,
  ca_35_dias_alerta NUMERIC DEFAULT 1.80,
  ca_42_dias_ok NUMERIC DEFAULT 1.70,
  ca_42_dias_alerta NUMERIC DEFAULT 1.95,
  
  -- Metas de Consumo (g/ave/dia)
  consumo_7_dias_min NUMERIC DEFAULT 25,
  consumo_7_dias_max NUMERIC DEFAULT 35,
  consumo_14_dias_min NUMERIC DEFAULT 50,
  consumo_14_dias_max NUMERIC DEFAULT 70,
  consumo_21_dias_min NUMERIC DEFAULT 90,
  consumo_21_dias_max NUMERIC DEFAULT 120,
  consumo_28_dias_min NUMERIC DEFAULT 130,
  consumo_28_dias_max NUMERIC DEFAULT 160,
  consumo_35_dias_min NUMERIC DEFAULT 160,
  consumo_35_dias_max NUMERIC DEFAULT 195,
  consumo_42_dias_min NUMERIC DEFAULT 180,
  consumo_42_dias_max NUMERIC DEFAULT 220,
  
  -- Medicamentos: carência mínima (dias antes do abate)
  carencia_medicamento_minimo INTEGER DEFAULT 7,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(integrado_id)
);

-- Enable RLS
ALTER TABLE public.metas_zootecnicas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org metas" ON public.metas_zootecnicas
  FOR SELECT USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert own org metas" ON public.metas_zootecnicas
  FOR INSERT WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can update own org metas" ON public.metas_zootecnicas
  FOR UPDATE USING (integrado_id = public.get_my_integrado_id());

-- Trigger para updated_at
CREATE TRIGGER update_metas_zootecnicas_updated_at
  BEFORE UPDATE ON public.metas_zootecnicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();