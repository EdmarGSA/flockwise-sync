-- Adicionar campos para automação na tabela ordens_producao
ALTER TABLE public.ordens_producao 
ADD COLUMN IF NOT EXISTS equipamento_id UUID,
ADD COLUMN IF NOT EXISTS tempo_mistura_previsto INTEGER,
ADD COLUMN IF NOT EXISTS tempo_mistura_real INTEGER,
ADD COLUMN IF NOT EXISTS lote_producao TEXT,
ADD COLUMN IF NOT EXISTS modo_execucao TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS tolerancia_variacao NUMERIC DEFAULT 1;

-- Criar tabela de equipamentos de produção
CREATE TABLE IF NOT EXISTS public.equipamentos_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  codigo_clp TEXT,
  ip_comunicacao TEXT,
  protocolo TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de logs de produção
CREATE TABLE IF NOT EXISTS public.producao_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_producao_id UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  insumo_id UUID REFERENCES public.produtos(id),
  quantidade NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem TEXT DEFAULT 'manual',
  equipamento_codigo TEXT,
  dados_adicionais JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela de configuração de tolerância
CREATE TABLE IF NOT EXISTS public.config_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL UNIQUE,
  tolerancia_insumo_percentual NUMERIC DEFAULT 1,
  tolerancia_producao_percentual NUMERIC DEFAULT 2,
  tempo_mistura_padrao_min INTEGER DEFAULT 5,
  modo_producao_padrao TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar FK de equipamento
ALTER TABLE public.ordens_producao
ADD CONSTRAINT ordens_producao_equipamento_id_fkey
FOREIGN KEY (equipamento_id) REFERENCES public.equipamentos_producao(id);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.equipamentos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_producao ENABLE ROW LEVEL SECURITY;

-- RLS policies para equipamentos_producao
CREATE POLICY "Users can view equipamentos_producao" ON public.equipamentos_producao
  FOR SELECT USING (true);

CREATE POLICY "Users can insert equipamentos_producao" ON public.equipamentos_producao
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update equipamentos_producao" ON public.equipamentos_producao
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete equipamentos_producao" ON public.equipamentos_producao
  FOR DELETE USING (true);

-- RLS policies para producao_logs
CREATE POLICY "Users can view producao_logs" ON public.producao_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert producao_logs" ON public.producao_logs
  FOR INSERT WITH CHECK (true);

-- RLS policies para config_producao
CREATE POLICY "Users can view config_producao" ON public.config_producao
  FOR SELECT USING (true);

CREATE POLICY "Users can insert config_producao" ON public.config_producao
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update config_producao" ON public.config_producao
  FOR UPDATE USING (true);

-- Trigger para updated_at nas novas tabelas
CREATE TRIGGER update_equipamentos_producao_updated_at
  BEFORE UPDATE ON public.equipamentos_producao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_producao_updated_at
  BEFORE UPDATE ON public.config_producao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();