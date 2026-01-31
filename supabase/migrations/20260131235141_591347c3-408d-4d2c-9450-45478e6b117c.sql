-- ============================================
-- FASE 1: Formas e Prazos de Pagamento do Fornecedor
-- ============================================

-- Formas de pagamento do fornecedor
CREATE TABLE formas_pagamento_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  codigo_erp TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fornecedor_global_id, codigo)
);

-- Prazos vinculados às formas
CREATE TABLE prazos_pagamento_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id) ON DELETE CASCADE,
  forma_pagamento_id UUID NOT NULL REFERENCES formas_pagamento_fornecedor(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dias_parcelas INTEGER[] NOT NULL DEFAULT '{0}',
  quantidade_parcelas INTEGER DEFAULT 1,
  codigo_erp TEXT,
  padrao BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FASE 2: Campos ERP nas Tabelas Existentes
-- ============================================

-- Pedidos - campos de integração ERP
ALTER TABLE pedidos_catalogo_fornecedor 
ADD COLUMN IF NOT EXISTS codigo_erp TEXT,
ADD COLUMN IF NOT EXISTS numero_nfe TEXT,
ADD COLUMN IF NOT EXISTS chave_nfe TEXT,
ADD COLUMN IF NOT EXISTS data_faturamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS erp_error_message TEXT,
ADD COLUMN IF NOT EXISTS erp_error_at TIMESTAMPTZ;

-- Clientes - campo código ERP
ALTER TABLE clientes_fornecedor 
ADD COLUMN IF NOT EXISTS codigo_erp TEXT;

-- Produtos - campo código ERP
ALTER TABLE produtos_catalogo_fornecedor 
ADD COLUMN IF NOT EXISTS codigo_erp TEXT;

-- ============================================
-- FASE 3: Índices para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_codigo_erp 
ON pedidos_catalogo_fornecedor(codigo_erp) 
WHERE codigo_erp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_fornecedor_codigo_erp 
ON clientes_fornecedor(codigo_erp) 
WHERE codigo_erp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_codigo_erp 
ON produtos_catalogo_fornecedor(codigo_erp) 
WHERE codigo_erp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fornecedor_global 
ON formas_pagamento_fornecedor(fornecedor_global_id);

CREATE INDEX IF NOT EXISTS idx_prazos_pagamento_fornecedor_global 
ON prazos_pagamento_fornecedor(fornecedor_global_id);

-- ============================================
-- FASE 4: RLS Policies
-- ============================================

-- Formas de pagamento do fornecedor
ALTER TABLE formas_pagamento_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedores podem ver suas formas de pagamento"
ON formas_pagamento_fornecedor FOR SELECT
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem criar formas de pagamento"
ON formas_pagamento_fornecedor FOR INSERT
WITH CHECK (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem atualizar suas formas de pagamento"
ON formas_pagamento_fornecedor FOR UPDATE
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem deletar suas formas de pagamento"
ON formas_pagamento_fornecedor FOR DELETE
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

-- Prazos de pagamento do fornecedor
ALTER TABLE prazos_pagamento_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedores podem ver seus prazos de pagamento"
ON prazos_pagamento_fornecedor FOR SELECT
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem criar prazos de pagamento"
ON prazos_pagamento_fornecedor FOR INSERT
WITH CHECK (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem atualizar seus prazos de pagamento"
ON prazos_pagamento_fornecedor FOR UPDATE
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fornecedores podem deletar seus prazos de pagamento"
ON prazos_pagamento_fornecedor FOR DELETE
USING (
  fornecedor_global_id IN (
    SELECT id FROM fornecedores_globais WHERE user_id = auth.uid()
  )
);

-- ============================================
-- FASE 5: Triggers para updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_formas_pagamento_fornecedor_updated_at
BEFORE UPDATE ON formas_pagamento_fornecedor
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prazos_pagamento_fornecedor_updated_at
BEFORE UPDATE ON prazos_pagamento_fornecedor
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();