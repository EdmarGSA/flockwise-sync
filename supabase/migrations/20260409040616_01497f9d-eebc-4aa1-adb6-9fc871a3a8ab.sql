
-- Enum para status da NF-e recebida
CREATE TYPE public.nfe_racao_status AS ENUM ('pendente_revisao', 'confirmada', 'rejeitada', 'erro');

-- Tabela principal
CREATE TABLE public.nfe_racao_recebidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  numero_nfe TEXT,
  serie TEXT,
  chave_nfe TEXT,
  cnpj_fornecedor TEXT,
  razao_social_fornecedor TEXT,
  data_emissao DATE,
  valor_total NUMERIC(12,2),
  valor_frete NUMERIC(12,2),
  xml_raw TEXT,
  itens JSONB DEFAULT '[]'::jsonb,
  status public.nfe_racao_status NOT NULL DEFAULT 'pendente_revisao',
  solicitacao_racao_id UUID REFERENCES public.solicitacoes_racao(id),
  lote_id UUID REFERENCES public.lotes(id),
  erro_mensagem TEXT,
  processado_por UUID,
  processado_em TIMESTAMPTZ,
  email_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único para evitar duplicatas de e-mail
CREATE UNIQUE INDEX idx_nfe_racao_email_message_id ON public.nfe_racao_recebidas(email_message_id) WHERE email_message_id IS NOT NULL;

-- Índices de consulta
CREATE INDEX idx_nfe_racao_integrado_status ON public.nfe_racao_recebidas(integrado_id, status);
CREATE INDEX idx_nfe_racao_chave ON public.nfe_racao_recebidas(chave_nfe);

-- RLS
ALTER TABLE public.nfe_racao_recebidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver NF-es da organização"
  ON public.nfe_racao_recebidas FOR SELECT
  TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Membros podem criar NF-es da organização"
  ON public.nfe_racao_recebidas FOR INSERT
  TO authenticated
  WITH CHECK (integrado_id = public.get_my_integrado_id());

CREATE POLICY "Membros podem atualizar NF-es da organização"
  ON public.nfe_racao_recebidas FOR UPDATE
  TO authenticated
  USING (integrado_id = public.get_my_integrado_id());

-- Service role (edge function) precisa inserir sem auth context
CREATE POLICY "Service role full access"
  ON public.nfe_racao_recebidas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_nfe_racao_recebidas_updated_at
  BEFORE UPDATE ON public.nfe_racao_recebidas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
