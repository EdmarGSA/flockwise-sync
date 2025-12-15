
-- Create movimentacoes_bancarias table for bank reconciliation
CREATE TABLE public.movimentacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  data_movimento DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  documento_ref TEXT,
  conta_pagar_id UUID REFERENCES public.contas_pagar(id) ON DELETE SET NULL,
  conta_receber_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL,
  conciliado BOOLEAN DEFAULT false,
  data_conciliacao TIMESTAMP WITH TIME ZONE,
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'ofx', 'automatico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view movimentacoes_bancarias"
ON public.movimentacoes_bancarias FOR SELECT USING (true);

CREATE POLICY "Users can insert movimentacoes_bancarias"
ON public.movimentacoes_bancarias FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update movimentacoes_bancarias"
ON public.movimentacoes_bancarias FOR UPDATE USING (true);

CREATE POLICY "Users can delete movimentacoes_bancarias"
ON public.movimentacoes_bancarias FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_movimentacoes_bancarias_updated_at
BEFORE UPDATE ON public.movimentacoes_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
