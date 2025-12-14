-- Create enum for observation priority
CREATE TYPE public.observacao_prioridade AS ENUM ('alta', 'media', 'baixa');

-- Create enum for observation type
CREATE TYPE public.observacao_tipo AS ENUM ('observacao', 'orientacao');

-- Create observacoes_lote table
CREATE TABLE public.observacoes_lote (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
    integrado_id UUID NOT NULL,
    criado_por UUID NOT NULL,
    dia_ciclo INTEGER NOT NULL,
    tipo observacao_tipo NOT NULL DEFAULT 'observacao',
    descricao TEXT NOT NULL,
    prioridade observacao_prioridade DEFAULT 'media',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.observacoes_lote ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view observacoes_lote"
ON public.observacoes_lote
FOR SELECT
USING (true);

CREATE POLICY "Users can insert observacoes_lote"
ON public.observacoes_lote
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update observacoes_lote"
ON public.observacoes_lote
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete observacoes_lote"
ON public.observacoes_lote
FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_observacoes_lote_updated_at
BEFORE UPDATE ON public.observacoes_lote
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();