-- Tabela para armazenar multiplicadores de meta de peso por linhagem e sexo
CREATE TABLE public.multiplicadores_meta_peso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  linhagem public.linhagem_aves NOT NULL,
  sexo public.sexo_ave NOT NULL,
  mult_7_dias NUMERIC(6,2) NOT NULL DEFAULT 4.9,
  mult_14_dias NUMERIC(6,2) NOT NULL DEFAULT 13.9,
  mult_21_dias NUMERIC(6,2) NOT NULL DEFAULT 27.2,
  mult_28_dias NUMERIC(6,2) NOT NULL DEFAULT 43.5,
  mult_35_dias NUMERIC(6,2) NOT NULL DEFAULT 61.5,
  mult_42_dias NUMERIC(6,2) NOT NULL DEFAULT 80.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_multiplicador_linhagem_sexo UNIQUE (integrado_id, linhagem, sexo)
);

-- Comentário da tabela
COMMENT ON TABLE public.multiplicadores_meta_peso IS 'Multiplicadores de meta de peso por linhagem e sexo para cálculo de metas zootécnicas';

-- Enable RLS
ALTER TABLE public.multiplicadores_meta_peso ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver multiplicadores da sua organização"
ON public.multiplicadores_meta_peso
FOR SELECT
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Usuários podem inserir multiplicadores na sua organização"
ON public.multiplicadores_meta_peso
FOR INSERT
WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Usuários podem atualizar multiplicadores da sua organização"
ON public.multiplicadores_meta_peso
FOR UPDATE
USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Usuários podem deletar multiplicadores da sua organização"
ON public.multiplicadores_meta_peso
FOR DELETE
USING (integrado_id = public.get_my_integrado_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_multiplicadores_meta_peso_updated_at
BEFORE UPDATE ON public.multiplicadores_meta_peso
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();