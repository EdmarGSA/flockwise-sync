-- =====================================================
-- GESTÃO DE CAMPO DO FORNECEDOR - Mini-ERP
-- =====================================================

-- Criar função set_updated_at se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 1. Tabela de Vendedores/Representantes do Fornecedor
CREATE TABLE public.vendedores_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  regiao TEXT,
  codigo_vendedor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_global_id, codigo_vendedor)
);

-- 2. Tabela de Núcleos do Fornecedor (Granjas dos clientes)
CREATE TABLE public.nucleos_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  cliente_fornecedor_id UUID NOT NULL REFERENCES public.clientes_fornecedor(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo_producao TEXT NOT NULL DEFAULT 'corte',
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Galpões do Fornecedor (Aviários nos núcleos)
CREATE TABLE public.galpoes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  nucleo_fornecedor_id UUID NOT NULL REFERENCES public.nucleos_fornecedor(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  capacidade_aves INTEGER NOT NULL DEFAULT 0,
  comprimento DECIMAL(10,2),
  largura DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Lotes do Fornecedor
CREATE TABLE public.lotes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  nucleo_fornecedor_id UUID NOT NULL REFERENCES public.nucleos_fornecedor(id) ON DELETE CASCADE,
  galpao_fornecedor_id UUID NOT NULL REFERENCES public.galpoes_fornecedor(id) ON DELETE CASCADE,
  vendedor_fornecedor_id UUID REFERENCES public.vendedores_fornecedor(id) ON DELETE SET NULL,
  codigo_lote TEXT,
  quantidade_aves INTEGER NOT NULL,
  linhagem TEXT,
  data_alojamento DATE,
  data_prevista_saida DATE,
  status TEXT NOT NULL DEFAULT 'previsao',
  sexo TEXT DEFAULT 'misto',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_vendedores_fornecedor_global ON public.vendedores_fornecedor(fornecedor_global_id);
CREATE INDEX idx_vendedores_fornecedor_ativo ON public.vendedores_fornecedor(ativo);

CREATE INDEX idx_nucleos_fornecedor_global ON public.nucleos_fornecedor(fornecedor_global_id);
CREATE INDEX idx_nucleos_fornecedor_cliente ON public.nucleos_fornecedor(cliente_fornecedor_id);
CREATE INDEX idx_nucleos_fornecedor_ativo ON public.nucleos_fornecedor(ativo);

CREATE INDEX idx_galpoes_fornecedor_global ON public.galpoes_fornecedor(fornecedor_global_id);
CREATE INDEX idx_galpoes_fornecedor_nucleo ON public.galpoes_fornecedor(nucleo_fornecedor_id);
CREATE INDEX idx_galpoes_fornecedor_ativo ON public.galpoes_fornecedor(ativo);

CREATE INDEX idx_lotes_fornecedor_global ON public.lotes_fornecedor(fornecedor_global_id);
CREATE INDEX idx_lotes_fornecedor_nucleo ON public.lotes_fornecedor(nucleo_fornecedor_id);
CREATE INDEX idx_lotes_fornecedor_galpao ON public.lotes_fornecedor(galpao_fornecedor_id);
CREATE INDEX idx_lotes_fornecedor_vendedor ON public.lotes_fornecedor(vendedor_fornecedor_id);
CREATE INDEX idx_lotes_fornecedor_status ON public.lotes_fornecedor(status);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER set_updated_at_vendedores_fornecedor
  BEFORE UPDATE ON public.vendedores_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_nucleos_fornecedor
  BEFORE UPDATE ON public.nucleos_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_galpoes_fornecedor
  BEFORE UPDATE ON public.galpoes_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_lotes_fornecedor
  BEFORE UPDATE ON public.lotes_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Vendedores
ALTER TABLE public.vendedores_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor CRUD próprios vendedores"
  ON public.vendedores_fornecedor
  FOR ALL
  USING (fornecedor_global_id = public.get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- Núcleos
ALTER TABLE public.nucleos_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor CRUD próprios núcleos"
  ON public.nucleos_fornecedor
  FOR ALL
  USING (fornecedor_global_id = public.get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- Galpões
ALTER TABLE public.galpoes_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor CRUD próprios galpões"
  ON public.galpoes_fornecedor
  FOR ALL
  USING (fornecedor_global_id = public.get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = public.get_my_fornecedor_global_id());

-- Lotes
ALTER TABLE public.lotes_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor CRUD próprios lotes"
  ON public.lotes_fornecedor
  FOR ALL
  USING (fornecedor_global_id = public.get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = public.get_my_fornecedor_global_id());