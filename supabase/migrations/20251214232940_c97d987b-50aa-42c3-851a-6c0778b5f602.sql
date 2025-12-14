
-- Create enum for payment methods
CREATE TYPE public.forma_pagamento AS ENUM ('boleto', 'pix', 'transferencia', 'dinheiro', 'cheque', 'cartao');

-- Add new columns to contas_pagar
ALTER TABLE public.contas_pagar 
ADD COLUMN conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
ADD COLUMN plano_conta_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
ADD COLUMN centro_custo_id UUID REFERENCES public.centro_custos(id) ON DELETE SET NULL,
ADD COLUMN forma_pagamento forma_pagamento,
ADD COLUMN numero_documento TEXT,
ADD COLUMN juros NUMERIC DEFAULT 0,
ADD COLUMN multa NUMERIC DEFAULT 0,
ADD COLUMN desconto NUMERIC DEFAULT 0,
ADD COLUMN valor_pago NUMERIC;
