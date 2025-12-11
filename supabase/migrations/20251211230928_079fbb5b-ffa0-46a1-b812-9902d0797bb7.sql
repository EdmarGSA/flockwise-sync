-- Create metas_peso table to store weight targets per batch
CREATE TABLE public.metas_peso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  peso_inicial_kg NUMERIC NOT NULL,
  meta_7_dias_kg NUMERIC NOT NULL,
  meta_14_dias_kg NUMERIC NOT NULL,
  meta_21_dias_kg NUMERIC NOT NULL,
  meta_28_dias_kg NUMERIC NOT NULL,
  meta_35_dias_kg NUMERIC NOT NULL,
  meta_42_dias_kg NUMERIC NOT NULL,
  gpd_kg NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lote_id)
);

-- Enable RLS
ALTER TABLE public.metas_peso ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view metas_peso" ON public.metas_peso FOR SELECT USING (true);
CREATE POLICY "Users can insert metas_peso" ON public.metas_peso FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update metas_peso" ON public.metas_peso FOR UPDATE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_metas_peso_updated_at
  BEFORE UPDATE ON public.metas_peso
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update pesagem_itens to use kg instead of grams
COMMENT ON COLUMN public.pesagem_itens.peso_bruto_g IS 'Peso bruto em kg (nome legado mantido por compatibilidade)';
COMMENT ON COLUMN public.pesagem_itens.peso_tara_g IS 'Peso tara em kg (nome legado mantido por compatibilidade)';
COMMENT ON COLUMN public.pesagem_itens.peso_liquido_g IS 'Peso líquido em kg (nome legado mantido por compatibilidade)';