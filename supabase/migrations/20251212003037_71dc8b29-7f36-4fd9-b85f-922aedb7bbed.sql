-- Create table for animal groups
CREATE TABLE public.grupos_animal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for animal phases within groups
CREATE TABLE public.fases_animal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos_animal(id) ON DELETE CASCADE,
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  dia_inicio INTEGER NOT NULL DEFAULT 0,
  dia_fim INTEGER NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grupos_animal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fases_animal ENABLE ROW LEVEL SECURITY;

-- RLS policies for grupos_animal
CREATE POLICY "Users can view grupos_animal" ON public.grupos_animal FOR SELECT USING (true);
CREATE POLICY "Users can insert grupos_animal" ON public.grupos_animal FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update grupos_animal" ON public.grupos_animal FOR UPDATE USING (true);

-- RLS policies for fases_animal
CREATE POLICY "Users can view fases_animal" ON public.fases_animal FOR SELECT USING (true);
CREATE POLICY "Users can insert fases_animal" ON public.fases_animal FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update fases_animal" ON public.fases_animal FOR UPDATE USING (true);
CREATE POLICY "Users can delete fases_animal" ON public.fases_animal FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_grupos_animal_updated_at
  BEFORE UPDATE ON public.grupos_animal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fases_animal_updated_at
  BEFORE UPDATE ON public.fases_animal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();