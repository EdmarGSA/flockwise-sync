-- Create table for medication configuration (carência, via de administração, etc.)
CREATE TABLE public.medicamentos_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    integrado_id UUID NOT NULL,
    carencia_dias INTEGER NOT NULL DEFAULT 0,
    via_administracao TEXT NOT NULL DEFAULT 'oral',
    dosagem_padrao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(produto_id, integrado_id)
);

-- Create table for treatment records
CREATE TABLE public.tratamentos_lote (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_id UUID NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id),
    integrado_id UUID NOT NULL,
    criado_por UUID NOT NULL,
    dosagem TEXT NOT NULL,
    via_administracao TEXT NOT NULL DEFAULT 'oral',
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    carencia_dias INTEGER NOT NULL DEFAULT 0,
    data_liberacao_abate DATE,
    quantidade_utilizada NUMERIC NOT NULL DEFAULT 0,
    unidade_medida TEXT NOT NULL DEFAULT 'ML',
    custo_total NUMERIC DEFAULT 0,
    motivo TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medicamentos_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamentos_lote ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medicamentos_config
CREATE POLICY "Users can view medicamentos_config"
ON public.medicamentos_config
FOR SELECT USING (true);

CREATE POLICY "Users can insert medicamentos_config"
ON public.medicamentos_config
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update medicamentos_config"
ON public.medicamentos_config
FOR UPDATE USING (true);

CREATE POLICY "Users can delete medicamentos_config"
ON public.medicamentos_config
FOR DELETE USING (true);

-- RLS Policies for tratamentos_lote
CREATE POLICY "Users can view tratamentos_lote"
ON public.tratamentos_lote
FOR SELECT USING (true);

CREATE POLICY "Users can insert tratamentos_lote"
ON public.tratamentos_lote
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tratamentos_lote"
ON public.tratamentos_lote
FOR UPDATE USING (true);

CREATE POLICY "Users can delete tratamentos_lote"
ON public.tratamentos_lote
FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_medicamentos_config_updated_at
BEFORE UPDATE ON public.medicamentos_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tratamentos_lote_updated_at
BEFORE UPDATE ON public.tratamentos_lote
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();