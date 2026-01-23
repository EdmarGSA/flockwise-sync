-- =============================================
-- FASE 1: INFRAESTRUTURA DE INTEGRAÇÃO ERP
-- =============================================

-- 1.1 Tabela de Log de Sincronização
CREATE TABLE public.sync_erp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('produtos', 'clientes', 'credito', 'pedidos', 'nfe')),
  direcao TEXT NOT NULL CHECK (direcao IN ('erp_para_cloud', 'cloud_para_erp')),
  registros_enviados INTEGER DEFAULT 0,
  registros_processados INTEGER DEFAULT 0,
  registros_erro INTEGER DEFAULT 0,
  erros JSONB DEFAULT '[]'::jsonb,
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Tabela de Mapeamento de IDs (Cloud <-> ERP)
CREATE TABLE public.sync_erp_mapeamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('produto', 'cliente', 'pedido')),
  id_cloud UUID NOT NULL,
  id_erp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_global_id, tipo_entidade, id_erp)
);

-- 1.3 Tabela de API Keys para Agentes Bridge
CREATE TABLE public.sync_erp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Adicionar campo codigo_erp em produto_fornecedor
ALTER TABLE public.produto_fornecedor 
ADD COLUMN IF NOT EXISTS codigo_erp TEXT;

-- 1.5 Adicionar campo codigo_erp em parceiros
ALTER TABLE public.parceiros 
ADD COLUMN IF NOT EXISTS codigo_erp TEXT;

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_sync_erp_log_fornecedor ON public.sync_erp_log(fornecedor_global_id);
CREATE INDEX idx_sync_erp_log_created ON public.sync_erp_log(created_at DESC);
CREATE INDEX idx_sync_erp_mapeamento_fornecedor ON public.sync_erp_mapeamento(fornecedor_global_id);
CREATE INDEX idx_sync_erp_mapeamento_lookup ON public.sync_erp_mapeamento(fornecedor_global_id, tipo_entidade, id_erp);
CREATE INDEX idx_sync_erp_api_keys_fornecedor ON public.sync_erp_api_keys(fornecedor_global_id);
CREATE INDEX idx_produto_fornecedor_codigo_erp ON public.produto_fornecedor(codigo_erp) WHERE codigo_erp IS NOT NULL;
CREATE INDEX idx_parceiros_codigo_erp ON public.parceiros(codigo_erp) WHERE codigo_erp IS NOT NULL;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.sync_erp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_erp_mapeamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_erp_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies para sync_erp_log (fornecedor pode ver seus próprios logs)
CREATE POLICY "Fornecedor pode ver seus logs de sync"
ON public.sync_erp_log FOR SELECT
USING (fornecedor_global_id = public.get_my_fornecedor_global_id());

CREATE POLICY "Fornecedor pode inserir logs de sync"
ON public.sync_erp_log FOR INSERT
WITH CHECK (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- Policies para sync_erp_mapeamento
CREATE POLICY "Fornecedor pode ver seus mapeamentos"
ON public.sync_erp_mapeamento FOR SELECT
USING (fornecedor_global_id = public.get_my_fornecedor_global_id());

CREATE POLICY "Fornecedor pode gerenciar seus mapeamentos"
ON public.sync_erp_mapeamento FOR ALL
USING (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- Policies para sync_erp_api_keys
CREATE POLICY "Fornecedor pode ver suas API keys"
ON public.sync_erp_api_keys FOR SELECT
USING (fornecedor_global_id = public.get_my_fornecedor_global_id());

CREATE POLICY "Fornecedor pode gerenciar suas API keys"
ON public.sync_erp_api_keys FOR ALL
USING (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================

CREATE TRIGGER update_sync_erp_mapeamento_updated_at
BEFORE UPDATE ON public.sync_erp_mapeamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();