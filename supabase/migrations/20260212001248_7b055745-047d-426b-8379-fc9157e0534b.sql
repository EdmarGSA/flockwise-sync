
-- 1. Add 'quebrado' to classificacao_peso_ovo enum
ALTER TYPE classificacao_peso_ovo ADD VALUE IF NOT EXISTS 'quebrado';

-- 2. Create destino_descarte_ovo enum
CREATE TYPE destino_descarte_ovo AS ENUM ('industria', 'compostagem', 'doacao', 'descarte_sanitario', 'reciclagem_animal', 'outro');

-- 3. Create descarte_ovos table
CREATE TABLE public.descarte_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  estoque_ovo_id UUID REFERENCES public.estoque_ovos(id),
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  destino destino_descarte_ovo NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.descarte_ovos ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
CREATE POLICY "Users can view own descarte_ovos"
ON public.descarte_ovos FOR SELECT
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Users can insert own descarte_ovos"
ON public.descarte_ovos FOR INSERT
WITH CHECK (integrado_id = public.get_my_integrado_id());
