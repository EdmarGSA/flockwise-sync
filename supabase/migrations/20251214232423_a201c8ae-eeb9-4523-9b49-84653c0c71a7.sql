
-- Create enum for account types
CREATE TYPE public.tipo_conta_bancaria AS ENUM ('corrente', 'poupanca', 'investimento');

-- Create enum for chart of accounts types
CREATE TYPE public.tipo_plano_conta AS ENUM ('receita', 'custo', 'despesa', 'investimento');

-- Create enum for chart of accounts nature
CREATE TYPE public.natureza_conta AS ENUM ('devedora', 'credora');

-- Create enum for cost center types
CREATE TYPE public.tipo_centro_custo AS ENUM ('lote', 'nucleo', 'geral', 'projeto');

-- Create enum for bank fee types
CREATE TYPE public.tipo_taxa_bancaria AS ENUM ('fixo', 'percentual');

-- Table: contas_bancarias (Bank Accounts)
CREATE TABLE public.contas_bancarias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integrado_id UUID NOT NULL,
    banco_codigo TEXT NOT NULL,
    banco_nome TEXT NOT NULL,
    agencia TEXT NOT NULL,
    conta TEXT NOT NULL,
    digito TEXT,
    tipo tipo_conta_bancaria NOT NULL DEFAULT 'corrente',
    saldo_inicial NUMERIC NOT NULL DEFAULT 0,
    saldo_atual NUMERIC NOT NULL DEFAULT 0,
    taxa_manutencao_mensal NUMERIC DEFAULT 0,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: plano_contas (Chart of Accounts - Hierarchical DRE)
CREATE TABLE public.plano_contas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integrado_id UUID NOT NULL,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo tipo_plano_conta NOT NULL,
    conta_pai_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
    nivel INTEGER NOT NULL DEFAULT 1,
    natureza natureza_conta NOT NULL DEFAULT 'devedora',
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(integrado_id, codigo)
);

-- Table: centro_custos (Cost Centers)
CREATE TABLE public.centro_custos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integrado_id UUID NOT NULL,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo tipo_centro_custo NOT NULL DEFAULT 'geral',
    lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
    nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(integrado_id, codigo)
);

-- Table: taxas_bancarias (Bank Fees)
CREATE TABLE public.taxas_bancarias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integrado_id UUID NOT NULL,
    conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo tipo_taxa_bancaria NOT NULL DEFAULT 'fixo',
    valor NUMERIC NOT NULL DEFAULT 0,
    plano_conta_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centro_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_bancarias ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contas_bancarias
CREATE POLICY "Users can view contas_bancarias" ON public.contas_bancarias FOR SELECT USING (true);
CREATE POLICY "Users can insert contas_bancarias" ON public.contas_bancarias FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contas_bancarias" ON public.contas_bancarias FOR UPDATE USING (true);
CREATE POLICY "Users can delete contas_bancarias" ON public.contas_bancarias FOR DELETE USING (true);

-- RLS Policies for plano_contas
CREATE POLICY "Users can view plano_contas" ON public.plano_contas FOR SELECT USING (true);
CREATE POLICY "Users can insert plano_contas" ON public.plano_contas FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update plano_contas" ON public.plano_contas FOR UPDATE USING (true);
CREATE POLICY "Users can delete plano_contas" ON public.plano_contas FOR DELETE USING (true);

-- RLS Policies for centro_custos
CREATE POLICY "Users can view centro_custos" ON public.centro_custos FOR SELECT USING (true);
CREATE POLICY "Users can insert centro_custos" ON public.centro_custos FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update centro_custos" ON public.centro_custos FOR UPDATE USING (true);
CREATE POLICY "Users can delete centro_custos" ON public.centro_custos FOR DELETE USING (true);

-- RLS Policies for taxas_bancarias
CREATE POLICY "Users can view taxas_bancarias" ON public.taxas_bancarias FOR SELECT USING (true);
CREATE POLICY "Users can insert taxas_bancarias" ON public.taxas_bancarias FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update taxas_bancarias" ON public.taxas_bancarias FOR UPDATE USING (true);
CREATE POLICY "Users can delete taxas_bancarias" ON public.taxas_bancarias FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plano_contas_updated_at BEFORE UPDATE ON public.plano_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_centro_custos_updated_at BEFORE UPDATE ON public.centro_custos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_taxas_bancarias_updated_at BEFORE UPDATE ON public.taxas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
