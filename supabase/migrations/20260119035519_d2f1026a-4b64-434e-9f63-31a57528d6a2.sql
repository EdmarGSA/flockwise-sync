-- Adicionar parceiro_id à tabela profiles para vincular fornecedor ao parceiro
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL;

-- Criar índice para parceiro_id
CREATE INDEX IF NOT EXISTS idx_profiles_parceiro_id ON public.profiles(parceiro_id);

-- Criar tabela de pedidos do fornecedor (pedidos feitos pelos clientes para o fornecedor)
CREATE TABLE IF NOT EXISTS public.pedidos_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integrado_id uuid NOT NULL,
  fornecedor_id uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  numero_pedido text NOT NULL,
  data_pedido timestamptz NOT NULL DEFAULT now(),
  data_entrega_prevista date,
  data_entrega_real date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'em_separacao', 'faturado', 'enviado', 'entregue', 'cancelado')),
  valor_total numeric(15,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de itens do pedido do fornecedor
CREATE TABLE IF NOT EXISTS public.pedidos_fornecedor_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_fornecedor(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade numeric(15,3) NOT NULL,
  unidade text NOT NULL,
  preco_unitario numeric(15,4) NOT NULL,
  valor_total numeric(15,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de histórico de preços do fornecedor
CREATE TABLE IF NOT EXISTS public.historico_precos_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_fornecedor_id uuid NOT NULL REFERENCES public.produto_fornecedor(id) ON DELETE CASCADE,
  preco_anterior numeric(15,4),
  preco_novo numeric(15,4) NOT NULL,
  data_alteracao timestamptz NOT NULL DEFAULT now(),
  motivo text,
  criado_por uuid
);

-- Criar tabela de promoções do fornecedor
CREATE TABLE IF NOT EXISTS public.promocoes_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  preco_promocional numeric(15,4),
  percentual_desconto numeric(5,2),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Criar tabela de notificações para fornecedor
CREATE TABLE IF NOT EXISTS public.notificacoes_fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  integrado_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('pedido_novo', 'pedido_cancelado', 'estoque_baixo', 'pagamento_recebido', 'promocao_expirada')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  data_leitura timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.pedidos_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_fornecedor_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_precos_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes_fornecedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_fornecedor ENABLE ROW LEVEL SECURITY;

-- Função para obter o parceiro_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_my_parceiro_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parceiro_id FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS para pedidos_fornecedor
CREATE POLICY "Fornecedor vê seus pedidos" ON public.pedidos_fornecedor
  FOR SELECT TO authenticated
  USING (
    fornecedor_id = get_my_parceiro_id()
    OR integrado_id = get_my_integrado_id()
  );

CREATE POLICY "Integrado cria pedidos para fornecedor" ON public.pedidos_fornecedor
  FOR INSERT TO authenticated
  WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Atualizar pedidos fornecedor" ON public.pedidos_fornecedor
  FOR UPDATE TO authenticated
  USING (
    fornecedor_id = get_my_parceiro_id()
    OR integrado_id = get_my_integrado_id()
  );

-- RLS para itens do pedido
CREATE POLICY "Ver itens pedido fornecedor" ON public.pedidos_fornecedor_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos_fornecedor p
      WHERE p.id = pedido_id
      AND (p.fornecedor_id = get_my_parceiro_id() OR p.integrado_id = get_my_integrado_id())
    )
  );

CREATE POLICY "Inserir itens pedido fornecedor" ON public.pedidos_fornecedor_itens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos_fornecedor p
      WHERE p.id = pedido_id AND p.integrado_id = get_my_integrado_id()
    )
  );

-- RLS para histórico de preços
CREATE POLICY "Ver histórico preços" ON public.historico_precos_fornecedor
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.produto_fornecedor pf
      WHERE pf.id = produto_fornecedor_id
      AND (pf.parceiro_id = get_my_parceiro_id() OR pf.integrado_id = get_my_integrado_id())
    )
  );

CREATE POLICY "Inserir histórico preços" ON public.historico_precos_fornecedor
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.produto_fornecedor pf
      WHERE pf.id = produto_fornecedor_id
      AND (pf.parceiro_id = get_my_parceiro_id() OR pf.integrado_id = get_my_integrado_id())
    )
  );

-- RLS para promoções
CREATE POLICY "Ver promoções" ON public.promocoes_fornecedor
  FOR SELECT TO authenticated
  USING (
    fornecedor_id = get_my_parceiro_id()
    OR EXISTS (
      SELECT 1 FROM public.produto_fornecedor pf
      WHERE pf.parceiro_id = fornecedor_id
      AND pf.integrado_id = get_my_integrado_id()
    )
  );

CREATE POLICY "Fornecedor gerencia promoções" ON public.promocoes_fornecedor
  FOR ALL TO authenticated
  USING (fornecedor_id = get_my_parceiro_id())
  WITH CHECK (fornecedor_id = get_my_parceiro_id());

-- RLS para notificações
CREATE POLICY "Fornecedor vê suas notificações" ON public.notificacoes_fornecedor
  FOR SELECT TO authenticated
  USING (fornecedor_id = get_my_parceiro_id());

CREATE POLICY "Sistema cria notificações" ON public.notificacoes_fornecedor
  FOR INSERT TO authenticated
  WITH CHECK (
    integrado_id = get_my_integrado_id()
    OR fornecedor_id = get_my_parceiro_id()
  );

CREATE POLICY "Fornecedor atualiza notificações" ON public.notificacoes_fornecedor
  FOR UPDATE TO authenticated
  USING (fornecedor_id = get_my_parceiro_id());

-- Triggers para updated_at
CREATE TRIGGER update_pedidos_fornecedor_updated_at
  BEFORE UPDATE ON public.pedidos_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promocoes_fornecedor_updated_at
  BEFORE UPDATE ON public.promocoes_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar histórico de preços automaticamente
CREATE OR REPLACE FUNCTION public.registrar_historico_preco()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.preco_compra IS DISTINCT FROM NEW.preco_compra THEN
    INSERT INTO public.historico_precos_fornecedor (
      produto_fornecedor_id, preco_anterior, preco_novo, criado_por
    ) VALUES (
      NEW.id, OLD.preco_compra, NEW.preco_compra, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_registrar_historico_preco
  AFTER UPDATE ON public.produto_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_preco();

-- Criar módulo portal-fornecedor
INSERT INTO public.modulos (codigo, nome, rota, icone, ordem, ativo)
VALUES ('portal-fornecedor', 'Portal do Fornecedor', '/portal-fornecedor', 'Truck', 100, true)
ON CONFLICT (codigo) DO NOTHING;