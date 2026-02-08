-- Tabela para configuração de webhooks por fornecedor
CREATE TABLE public.webhooks_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id uuid NOT NULL REFERENCES public.fornecedores_globais(id) ON DELETE CASCADE,
  evento text NOT NULL DEFAULT 'pedido_criado',
  url text NOT NULL,
  secret text, -- Para assinatura HMAC (opcional)
  ativo boolean NOT NULL DEFAULT true,
  tentativas_max integer NOT NULL DEFAULT 3,
  timeout_ms integer NOT NULL DEFAULT 5000,
  headers jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhooks_fornecedor_evento_check CHECK (evento IN ('pedido_criado', 'pedido_atualizado', 'pedido_cancelado'))
);

-- Índice para busca rápida por fornecedor e evento
CREATE INDEX idx_webhooks_fornecedor_lookup ON public.webhooks_fornecedor(fornecedor_global_id, evento, ativo);

-- Tabela de log de entregas de webhook
CREATE TABLE public.webhooks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks_fornecedor(id) ON DELETE SET NULL,
  fornecedor_global_id uuid NOT NULL,
  evento text NOT NULL,
  payload jsonb NOT NULL,
  tentativa integer NOT NULL DEFAULT 1,
  status_code integer,
  resposta text,
  erro text,
  duracao_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para consulta de logs por fornecedor
CREATE INDEX idx_webhooks_log_fornecedor ON public.webhooks_log(fornecedor_global_id, created_at DESC);

-- RLS para webhooks_fornecedor
ALTER TABLE public.webhooks_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor pode gerenciar seus webhooks"
ON public.webhooks_fornecedor
FOR ALL
USING (fornecedor_global_id = get_my_fornecedor_global_id())
WITH CHECK (fornecedor_global_id = get_my_fornecedor_global_id());

-- RLS para webhooks_log (somente leitura)
ALTER TABLE public.webhooks_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedor pode ver logs de seus webhooks"
ON public.webhooks_log
FOR SELECT
USING (fornecedor_global_id = get_my_fornecedor_global_id());

-- Trigger para updated_at
CREATE TRIGGER set_webhooks_fornecedor_updated_at
BEFORE UPDATE ON public.webhooks_fornecedor
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Comentários
COMMENT ON TABLE public.webhooks_fornecedor IS 'Configuração de webhooks para notificação automática de eventos';
COMMENT ON TABLE public.webhooks_log IS 'Log de entregas de webhooks para auditoria e debugging';
COMMENT ON COLUMN public.webhooks_fornecedor.secret IS 'Chave para assinatura HMAC-SHA256 do payload';