
-- Feed requests table
CREATE TABLE public.solicitacoes_racao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id UUID NOT NULL,
  integrado_id UUID NOT NULL,
  tipo_racao TEXT NOT NULL,
  quantidade_solicitada_kg NUMERIC NOT NULL,
  data_prevista_entrega TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'solicitado',
  observacoes TEXT,
  solicitado_por UUID,
  confirmado_por UUID,
  data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_confirmacao TIMESTAMP WITH TIME ZONE,
  data_envio TIMESTAMP WITH TIME ZONE,
  data_recebimento TIMESTAMP WITH TIME ZONE,
  quantidade_recebida_kg NUMERIC,
  quantidade_devolvida_kg NUMERIC DEFAULT 0,
  data_devolucao TIMESTAMP WITH TIME ZONE,
  devolucao_confirmada BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacoes_racao ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view solicitacoes_racao" 
ON public.solicitacoes_racao 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert solicitacoes_racao" 
ON public.solicitacoes_racao 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update solicitacoes_racao" 
ON public.solicitacoes_racao 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_solicitacoes_racao_updated_at
BEFORE UPDATE ON public.solicitacoes_racao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes_racao;
