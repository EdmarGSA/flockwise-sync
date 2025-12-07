
-- Create enum for production type
CREATE TYPE public.tipo_producao AS ENUM ('corte', 'postura');

-- Create enum for shed pressure type
CREATE TYPE public.tipo_pressao AS ENUM ('positiva', 'negativa', 'darkhouse');

-- Create enum for feeder type
CREATE TYPE public.tipo_comedouro AS ENUM ('manual', 'automatico');

-- Create enum for drinker type
CREATE TYPE public.tipo_bebedouro AS ENUM ('niple', 'tacas');

-- Create nucleos table (Core/Farm Units)
CREATE TABLE public.nucleos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  cep TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  codigo_ibge TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  tipo_producao tipo_producao NOT NULL,
  integrado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Create galpoes table (Sheds)
CREATE TABLE public.galpoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE RESTRICT,
  comprimento DECIMAL(10,2) NOT NULL,
  largura DECIMAL(10,2) NOT NULL,
  altura DECIMAL(10,2) NOT NULL,
  tipo_pressao tipo_pressao NOT NULL,
  -- Silos
  silo_quantidade INTEGER NOT NULL DEFAULT 0,
  silo_volume_total DECIMAL(10,2) DEFAULT 0,
  -- Comedouros
  comedouro_tipo tipo_comedouro NOT NULL,
  comedouro_quantidade INTEGER NOT NULL DEFAULT 0,
  -- Bebedouros
  bebedouro_tipo tipo_bebedouro NOT NULL,
  bebedouro_quantidade INTEGER NOT NULL DEFAULT 0,
  -- Ventiladores
  ventilador_quantidade INTEGER NOT NULL DEFAULT 0,
  -- Caixa d'água
  caixa_agua_quantidade INTEGER NOT NULL DEFAULT 0,
  caixa_agua_volume_total DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galpoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nucleos
CREATE POLICY "Users can view nucleos" ON public.nucleos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert nucleos" ON public.nucleos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update nucleos" ON public.nucleos
  FOR UPDATE TO authenticated USING (true);

-- RLS Policies for galpoes
CREATE POLICY "Users can view galpoes" ON public.galpoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert galpoes" ON public.galpoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update galpoes" ON public.galpoes
  FOR UPDATE TO authenticated USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_nucleos_updated_at
  BEFORE UPDATE ON public.nucleos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galpoes_updated_at
  BEFORE UPDATE ON public.galpoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
