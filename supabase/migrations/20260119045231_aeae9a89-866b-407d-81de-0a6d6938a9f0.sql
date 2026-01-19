-- =====================================================
-- TABELA GLOBAL DE FORNECEDORES (sem integrado_id)
-- =====================================================
CREATE TABLE public.fornecedores_globais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_cnpj TEXT NOT NULL UNIQUE,
  razao_social_nome TEXT NOT NULL,
  nome_fantasia TEXT,
  email TEXT,
  telefone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por CNPJ
CREATE INDEX idx_fornecedores_globais_cnpj ON fornecedores_globais(cpf_cnpj);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fornecedores_globais_updated_at
  BEFORE UPDATE ON fornecedores_globais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE fornecedores_globais ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ADICIONAR FK EM PARCEIROS
-- =====================================================
ALTER TABLE public.parceiros
  ADD COLUMN fornecedor_global_id UUID REFERENCES fornecedores_globais(id);

CREATE INDEX idx_parceiros_fornecedor_global ON parceiros(fornecedor_global_id);

-- =====================================================
-- ADICIONAR FK EM PROFILES
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN fornecedor_global_id UUID REFERENCES fornecedores_globais(id);

CREATE INDEX idx_profiles_fornecedor_global ON profiles(fornecedor_global_id);

-- =====================================================
-- FUNÇÃO PARA BUSCAR FORNECEDOR GLOBAL ID DO USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_fornecedor_global_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fornecedor_global_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================
-- RLS POLICIES PARA fornecedores_globais
-- =====================================================

-- Fornecedor vê seu próprio registro
CREATE POLICY "Fornecedor vê próprio registro global"
ON fornecedores_globais FOR SELECT
USING (user_id = auth.uid());

-- Organizações podem ver fornecedores que elas vincularam
CREATE POLICY "Orgs veem fornecedores vinculados"
ON fornecedores_globais FOR SELECT
USING (
  id IN (
    SELECT fornecedor_global_id 
    FROM parceiros 
    WHERE integrado_id = get_my_integrado_id()
      AND fornecedor_global_id IS NOT NULL
  )
);

-- Organizações podem criar novos fornecedores globais
CREATE POLICY "Orgs podem criar fornecedores globais"
ON fornecedores_globais FOR INSERT
WITH CHECK (can_modify_data());

-- Fornecedor pode atualizar seu próprio registro
CREATE POLICY "Fornecedor atualiza próprio registro"
ON fornecedores_globais FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ATUALIZAR RLS POLICIES DE ordens_compra PARA FORNECEDORES GLOBAIS
-- =====================================================

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Fornecedor vê suas ordens de compra" ON ordens_compra;

-- Nova policy usando fornecedor_global_id
CREATE POLICY "Fornecedor global vê OCs de clientes"
ON ordens_compra FOR SELECT
USING (
  parceiro_id IN (
    SELECT p.id 
    FROM parceiros p
    WHERE p.fornecedor_global_id = get_my_fornecedor_global_id()
  )
);

-- Atualizar policy de update
DROP POLICY IF EXISTS "Fornecedor atualiza campos específicos das OCs" ON ordens_compra;

CREATE POLICY "Fornecedor global atualiza OCs"
ON ordens_compra FOR UPDATE
USING (
  parceiro_id IN (
    SELECT p.id 
    FROM parceiros p
    WHERE p.fornecedor_global_id = get_my_fornecedor_global_id()
  )
)
WITH CHECK (
  parceiro_id IN (
    SELECT p.id 
    FROM parceiros p
    WHERE p.fornecedor_global_id = get_my_fornecedor_global_id()
  )
);

-- =====================================================
-- ATUALIZAR RLS DE ordens_compra_itens
-- =====================================================
DROP POLICY IF EXISTS "Fornecedor vê itens de suas ordens" ON ordens_compra_itens;

CREATE POLICY "Fornecedor global vê itens de OCs"
ON ordens_compra_itens FOR SELECT
USING (
  ordem_compra_id IN (
    SELECT oc.id 
    FROM ordens_compra oc
    JOIN parceiros p ON oc.parceiro_id = p.id
    WHERE p.fornecedor_global_id = get_my_fornecedor_global_id()
  )
);