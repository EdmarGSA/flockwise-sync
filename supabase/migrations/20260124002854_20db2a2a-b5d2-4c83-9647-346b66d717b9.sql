-- =============================================================================
-- Tabela: clientes_fornecedor
-- Armazena clientes virtuais exclusivos de cada fornecedor
-- =============================================================================
CREATE TABLE public.clientes_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  tipo_pessoa TEXT NOT NULL DEFAULT 'juridica' CHECK (tipo_pessoa IN ('fisica', 'juridica')),
  cpf_cnpj TEXT NOT NULL,
  razao_social_nome TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  telefone TEXT,
  celular TEXT,
  email TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  codigo_ibge TEXT,
  limite_credito NUMERIC(15,2) DEFAULT 0,
  saldo_credito NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_global_id, cpf_cnpj)
);

-- Índices para performance
CREATE INDEX idx_clientes_fornecedor_global_id ON public.clientes_fornecedor(fornecedor_global_id);
CREATE INDEX idx_clientes_fornecedor_cpf_cnpj ON public.clientes_fornecedor(cpf_cnpj);
CREATE INDEX idx_clientes_fornecedor_ativo ON public.clientes_fornecedor(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_fornecedor_updated_at
  BEFORE UPDATE ON public.clientes_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para isolamento total
ALTER TABLE public.clientes_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor gerencia próprios clientes"
  ON public.clientes_fornecedor
  FOR ALL
  USING (fornecedor_global_id = get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = get_my_fornecedor_global_id());

-- =============================================================================
-- Tabela: produtos_catalogo_fornecedor
-- Catálogo de produtos exclusivo de cada fornecedor
-- =============================================================================
CREATE TABLE public.produtos_catalogo_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  codigo_interno TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  marca TEXT,
  unidade_venda TEXT NOT NULL DEFAULT 'UN',
  preco_tabela NUMERIC(15,2) DEFAULT 0,
  custo NUMERIC(15,2),
  codigo_barras TEXT,
  ncm TEXT,
  estoque_proprio NUMERIC(15,3) DEFAULT 0,
  estoque_minimo NUMERIC(15,3) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fornecedor_global_id, codigo_interno)
);

-- Índices para performance
CREATE INDEX idx_produtos_catalogo_fornecedor_global_id ON public.produtos_catalogo_fornecedor(fornecedor_global_id);
CREATE INDEX idx_produtos_catalogo_fornecedor_codigo ON public.produtos_catalogo_fornecedor(codigo_interno);
CREATE INDEX idx_produtos_catalogo_fornecedor_nome ON public.produtos_catalogo_fornecedor(nome);
CREATE INDEX idx_produtos_catalogo_fornecedor_ativo ON public.produtos_catalogo_fornecedor(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_produtos_catalogo_fornecedor_updated_at
  BEFORE UPDATE ON public.produtos_catalogo_fornecedor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para isolamento total
ALTER TABLE public.produtos_catalogo_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor gerencia próprio catálogo"
  ON public.produtos_catalogo_fornecedor
  FOR ALL
  USING (fornecedor_global_id = get_my_fornecedor_global_id())
  WITH CHECK (fornecedor_global_id = get_my_fornecedor_global_id());

-- Comentários nas tabelas
COMMENT ON TABLE public.clientes_fornecedor IS 'Clientes virtuais exclusivos de cada fornecedor - não são usuários do sistema';
COMMENT ON TABLE public.produtos_catalogo_fornecedor IS 'Catálogo de produtos exclusivo de cada fornecedor';