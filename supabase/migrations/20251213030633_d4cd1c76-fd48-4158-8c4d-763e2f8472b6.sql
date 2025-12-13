-- Create enum for person type
CREATE TYPE public.tipo_pessoa AS ENUM ('pf', 'pj', 'produtor_rural');

-- Create enum for registration type
CREATE TYPE public.tipo_cadastro AS ENUM ('cliente', 'fornecedor', 'ambos');

-- Create partners table
CREATE TABLE public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  tipo_cadastro tipo_cadastro NOT NULL DEFAULT 'cliente',
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'pj',
  cpf_cnpj TEXT NOT NULL,
  razao_social_nome TEXT NOT NULL,
  nome_fantasia TEXT,
  rg TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  inscricao_produtor TEXT,
  telefone TEXT,
  celular TEXT,
  email TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  codigo_ibge TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integrado_id, cpf_cnpj)
);

-- Enable RLS
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view parceiros"
ON public.parceiros
FOR SELECT
USING (true);

CREATE POLICY "Users can insert parceiros"
ON public.parceiros
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update parceiros"
ON public.parceiros
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_parceiros_updated_at
BEFORE UPDATE ON public.parceiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();