-- Create enum for batch status
CREATE TYPE public.lote_status AS ENUM ('previsao', 'alojado', 'fechado');

-- Create enum for bird lineage
CREATE TYPE public.linhagem_aves AS ENUM ('cobb_500', 'ross_308', 'hubbard');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'integrado', 'veterinario', 'tecnico');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create areas table
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#22c55e',
  integrado_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on areas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- RLS policies for areas
CREATE POLICY "Users can view areas"
ON public.areas
FOR SELECT
USING (true);

CREATE POLICY "Users can insert areas"
ON public.areas
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update areas"
ON public.areas
FOR UPDATE
USING (true);

-- Create lotes (batches) table
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
  galpao_id UUID NOT NULL REFERENCES public.galpoes(id) ON DELETE CASCADE,
  quantidade_aves INTEGER NOT NULL,
  data_prevista_alojamento DATE NOT NULL,
  data_alojamento DATE,
  data_fechamento DATE,
  linhagem linhagem_aves NOT NULL,
  veterinario_id UUID,
  status lote_status NOT NULL DEFAULT 'previsao',
  observacoes TEXT,
  integrado_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lotes
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for lotes
CREATE POLICY "Users can view lotes"
ON public.lotes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert lotes"
ON public.lotes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update lotes"
ON public.lotes
FOR UPDATE
USING (true);

-- Add area_id to nucleos table
ALTER TABLE public.nucleos ADD COLUMN area_id UUID REFERENCES public.areas(id);

-- Create trigger for areas updated_at
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for lotes updated_at
CREATE TRIGGER update_lotes_updated_at
BEFORE UPDATE ON public.lotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if galpao has active lote
CREATE OR REPLACE FUNCTION public.galpao_has_active_lote(_galpao_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lotes
    WHERE galpao_id = _galpao_id
      AND status IN ('previsao', 'alojado')
  )
$$;

-- Function to get veterinarios (users with veterinario role)
CREATE OR REPLACE FUNCTION public.get_veterinarios()
RETURNS TABLE (
  id UUID,
  full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'veterinario'
$$;