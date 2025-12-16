
-- ==========================================
-- FASE 1: Sistema de Gestão de Ovos
-- ==========================================

-- 1. Enum para tipos de ovo
CREATE TYPE tipo_ovo AS ENUM ('branco', 'castanho', 'vermelho', 'caipira');

-- 2. Enum para classificação de peso (já existe no sistema, mas criamos para ovos)
CREATE TYPE classificacao_peso_ovo AS ENUM ('medio', 'grande', 'extra', 'jumbo');

-- 3. Enum para unidade de venda de ovos
CREATE TYPE unidade_venda_ovo AS ENUM ('UN', 'DZ', 'CX_15', 'CX_30', 'BDJ_30', 'BDJ_60', 'BDJ_180', 'BDJ_360');

-- 4. Tabela de estoque de ovos (FIFO por data de produção)
CREATE TABLE public.estoque_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  lote_producao_id UUID REFERENCES public.lotes(id),
  lote_interno TEXT NOT NULL, -- Código interno para rastreio (ex: OV-2024-001)
  tipo_ovo tipo_ovo NOT NULL,
  classificacao_peso classificacao_peso_ovo NOT NULL,
  data_producao DATE NOT NULL,
  data_validade DATE NOT NULL,
  quantidade_inicial INTEGER NOT NULL, -- Quantidade em UNIDADES
  quantidade_atual INTEGER NOT NULL, -- Quantidade disponível em UNIDADES
  quantidade_reservada INTEGER NOT NULL DEFAULT 0, -- Reservado para pedidos
  custo_unitario NUMERIC DEFAULT 0, -- Custo por unidade
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para FIFO e consultas frequentes
CREATE INDEX idx_estoque_ovos_fifo ON public.estoque_ovos(data_producao ASC, data_validade ASC) WHERE ativo = true AND quantidade_atual > 0;
CREATE INDEX idx_estoque_ovos_tipo ON public.estoque_ovos(tipo_ovo, classificacao_peso);
CREATE INDEX idx_estoque_ovos_lote ON public.estoque_ovos(lote_interno);
CREATE INDEX idx_estoque_ovos_validade ON public.estoque_ovos(data_validade) WHERE ativo = true AND quantidade_atual > 0;

-- 5. Tabela de produtos de ovos (catálogo comercial)
CREATE TABLE public.produtos_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL, -- Ex: "Ovos Caipira Grande DZ 1x12"
  descricao TEXT,
  tipo_ovo tipo_ovo NOT NULL,
  classificacao_peso classificacao_peso_ovo NOT NULL,
  unidade_venda unidade_venda_ovo NOT NULL DEFAULT 'DZ',
  fator_conversao INTEGER NOT NULL DEFAULT 12, -- Quantas unidades por unidade de venda (DZ=12, CX_30=30)
  preco_venda NUMERIC DEFAULT 0,
  margem_minima NUMERIC DEFAULT 10, -- Margem mínima em %
  estoque_minimo INTEGER DEFAULT 0, -- Em unidades de venda
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integrado_id, codigo)
);

CREATE INDEX idx_produtos_ovos_tipo ON public.produtos_ovos(tipo_ovo, classificacao_peso);

-- 6. Tabela de movimentação de ovos (kardex)
CREATE TABLE public.kardex_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integrado_id UUID NOT NULL,
  estoque_ovo_id UUID NOT NULL REFERENCES public.estoque_ovos(id),
  tipo_movimento TEXT NOT NULL, -- 'entrada_producao', 'saida_venda', 'saida_perda', 'saida_descarte', 'ajuste_positivo', 'ajuste_negativo'
  quantidade INTEGER NOT NULL, -- Sempre em UNIDADES
  saldo_anterior INTEGER NOT NULL,
  saldo_atual INTEGER NOT NULL,
  documento_ref TEXT, -- Referência (pedido, produção, etc)
  pedido_id UUID REFERENCES public.pedidos(id),
  producao_ovos_id UUID REFERENCES public.producao_ovos(id),
  observacao TEXT,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kardex_ovos_estoque ON public.kardex_ovos(estoque_ovo_id);
CREATE INDEX idx_kardex_ovos_data ON public.kardex_ovos(created_at DESC);

-- 7. Tabela de itens de pedido de ovos (vincula pedido comercial ao estoque)
CREATE TABLE public.pedido_itens_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_ovo_id UUID NOT NULL REFERENCES public.produtos_ovos(id),
  quantidade INTEGER NOT NULL, -- Em unidade de venda (ex: 10 DZ)
  quantidade_unidades INTEGER NOT NULL, -- Em unidades (ex: 120 UN)
  preco_unitario NUMERIC NOT NULL, -- Preço por unidade de venda
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_itens_ovos_pedido ON public.pedido_itens_ovos(pedido_id);

-- 8. Tabela de reserva de estoque (FIFO para pedidos)
CREATE TABLE public.reserva_estoque_ovos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_item_ovo_id UUID NOT NULL REFERENCES public.pedido_itens_ovos(id) ON DELETE CASCADE,
  estoque_ovo_id UUID NOT NULL REFERENCES public.estoque_ovos(id),
  quantidade_reservada INTEGER NOT NULL, -- Quantidade reservada deste lote em UNIDADES
  lote_interno TEXT NOT NULL, -- Para rastreabilidade
  data_producao DATE NOT NULL,
  data_validade DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reserva_estoque_pedido ON public.reserva_estoque_ovos(pedido_item_ovo_id);
CREATE INDEX idx_reserva_estoque_lote ON public.reserva_estoque_ovos(estoque_ovo_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- estoque_ovos
ALTER TABLE public.estoque_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estoque_ovos" ON public.estoque_ovos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert estoque_ovos" ON public.estoque_ovos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update estoque_ovos" ON public.estoque_ovos
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete estoque_ovos" ON public.estoque_ovos
  FOR DELETE USING (true);

-- produtos_ovos
ALTER TABLE public.produtos_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view produtos_ovos" ON public.produtos_ovos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert produtos_ovos" ON public.produtos_ovos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update produtos_ovos" ON public.produtos_ovos
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete produtos_ovos" ON public.produtos_ovos
  FOR DELETE USING (true);

-- kardex_ovos
ALTER TABLE public.kardex_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kardex_ovos" ON public.kardex_ovos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert kardex_ovos" ON public.kardex_ovos
  FOR INSERT WITH CHECK (true);

-- pedido_itens_ovos
ALTER TABLE public.pedido_itens_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedido_itens_ovos" ON public.pedido_itens_ovos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert pedido_itens_ovos" ON public.pedido_itens_ovos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update pedido_itens_ovos" ON public.pedido_itens_ovos
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete pedido_itens_ovos" ON public.pedido_itens_ovos
  FOR DELETE USING (true);

-- reserva_estoque_ovos
ALTER TABLE public.reserva_estoque_ovos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reserva_estoque_ovos" ON public.reserva_estoque_ovos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert reserva_estoque_ovos" ON public.reserva_estoque_ovos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete reserva_estoque_ovos" ON public.reserva_estoque_ovos
  FOR DELETE USING (true);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_estoque_ovos_updated_at
  BEFORE UPDATE ON public.estoque_ovos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_ovos_updated_at
  BEFORE UPDATE ON public.produtos_ovos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- FUNÇÃO PARA GERAR LOTE INTERNO
-- ==========================================

CREATE OR REPLACE FUNCTION public.gerar_lote_interno_ovos(p_integrado_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
  v_lote TEXT;
BEGIN
  v_ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Busca o próximo sequencial do ano para este integrado
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(lote_interno FROM 'OV-' || v_ano || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.estoque_ovos
  WHERE integrado_id = p_integrado_id
    AND lote_interno LIKE 'OV-' || v_ano || '-%';
  
  v_lote := 'OV-' || v_ano || '-' || LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_lote;
END;
$$;

-- ==========================================
-- FUNÇÃO PARA RESERVAR ESTOQUE FIFO
-- ==========================================

CREATE OR REPLACE FUNCTION public.reservar_estoque_ovos_fifo(
  p_integrado_id UUID,
  p_tipo_ovo tipo_ovo,
  p_classificacao classificacao_peso_ovo,
  p_quantidade_unidades INTEGER,
  p_pedido_item_ovo_id UUID
)
RETURNS TABLE(
  estoque_id UUID,
  lote_interno TEXT,
  quantidade_reservada INTEGER,
  data_producao DATE,
  data_validade DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restante INTEGER := p_quantidade_unidades;
  v_estoque RECORD;
  v_reserva INTEGER;
BEGIN
  -- Busca estoque disponível em ordem FIFO (mais antigo primeiro)
  FOR v_estoque IN
    SELECT e.id, e.lote_interno, e.quantidade_atual - e.quantidade_reservada AS disponivel,
           e.data_producao, e.data_validade
    FROM public.estoque_ovos e
    WHERE e.integrado_id = p_integrado_id
      AND e.tipo_ovo = p_tipo_ovo
      AND e.classificacao_peso = p_classificacao
      AND e.ativo = true
      AND e.data_validade > CURRENT_DATE
      AND (e.quantidade_atual - e.quantidade_reservada) > 0
    ORDER BY e.data_producao ASC, e.data_validade ASC
  LOOP
    EXIT WHEN v_restante <= 0;
    
    -- Calcula quantidade a reservar deste lote
    v_reserva := LEAST(v_estoque.disponivel, v_restante);
    
    -- Atualiza quantidade reservada no estoque
    UPDATE public.estoque_ovos
    SET quantidade_reservada = quantidade_reservada + v_reserva
    WHERE id = v_estoque.id;
    
    -- Insere registro de reserva
    INSERT INTO public.reserva_estoque_ovos (
      pedido_item_ovo_id, estoque_ovo_id, quantidade_reservada,
      lote_interno, data_producao, data_validade
    ) VALUES (
      p_pedido_item_ovo_id, v_estoque.id, v_reserva,
      v_estoque.lote_interno, v_estoque.data_producao, v_estoque.data_validade
    );
    
    -- Retorna info da reserva
    estoque_id := v_estoque.id;
    lote_interno := v_estoque.lote_interno;
    quantidade_reservada := v_reserva;
    data_producao := v_estoque.data_producao;
    data_validade := v_estoque.data_validade;
    RETURN NEXT;
    
    v_restante := v_restante - v_reserva;
  END LOOP;
  
  -- Se não conseguiu reservar tudo, retorna aviso
  IF v_restante > 0 THEN
    RAISE WARNING 'Estoque insuficiente. Faltam % unidades', v_restante;
  END IF;
  
  RETURN;
END;
$$;
