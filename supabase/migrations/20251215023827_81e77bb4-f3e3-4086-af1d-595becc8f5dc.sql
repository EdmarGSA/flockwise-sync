
-- Create formas_pagamento table
CREATE TABLE public.formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create prazos_pagamento table
CREATE TABLE public.prazos_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id UUID NOT NULL,
  forma_pagamento_id UUID NOT NULL REFERENCES public.formas_pagamento(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dias_parcelas INT[] NOT NULL DEFAULT '{0}',
  quantidade_parcelas INT DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prazos_pagamento ENABLE ROW LEVEL SECURITY;

-- RLS policies for formas_pagamento
CREATE POLICY "Users can view formas_pagamento" ON public.formas_pagamento
  FOR SELECT USING (true);

CREATE POLICY "Users can insert formas_pagamento" ON public.formas_pagamento
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update formas_pagamento" ON public.formas_pagamento
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete formas_pagamento" ON public.formas_pagamento
  FOR DELETE USING (true);

-- RLS policies for prazos_pagamento
CREATE POLICY "Users can view prazos_pagamento" ON public.prazos_pagamento
  FOR SELECT USING (true);

CREATE POLICY "Users can insert prazos_pagamento" ON public.prazos_pagamento
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update prazos_pagamento" ON public.prazos_pagamento
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete prazos_pagamento" ON public.prazos_pagamento
  FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_formas_pagamento_updated_at
  BEFORE UPDATE ON public.formas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prazos_pagamento_updated_at
  BEFORE UPDATE ON public.prazos_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
