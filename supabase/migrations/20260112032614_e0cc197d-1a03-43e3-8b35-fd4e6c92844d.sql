-- Fix RLS policies for child tables that use USING (true)
-- These child tables need to validate via their parent table's integrado_id

-- 1. mortalidade_itens (parent: mortalidade)
DROP POLICY IF EXISTS "Users can delete mortalidade_itens" ON public.mortalidade_itens;
DROP POLICY IF EXISTS "Users can insert mortalidade_itens" ON public.mortalidade_itens;
DROP POLICY IF EXISTS "Users can update mortalidade_itens" ON public.mortalidade_itens;
DROP POLICY IF EXISTS "Users can view mortalidade_itens" ON public.mortalidade_itens;

CREATE POLICY "Users can delete mortalidade_itens" ON public.mortalidade_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.mortalidade m
    WHERE m.id = mortalidade_itens.mortalidade_id
    AND m.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert mortalidade_itens" ON public.mortalidade_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mortalidade m
    WHERE m.id = mortalidade_itens.mortalidade_id
    AND m.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update mortalidade_itens" ON public.mortalidade_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.mortalidade m
    WHERE m.id = mortalidade_itens.mortalidade_id
    AND m.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view mortalidade_itens" ON public.mortalidade_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.mortalidade m
    WHERE m.id = mortalidade_itens.mortalidade_id
    AND m.integrado_id = get_my_integrado_id()
  )
);

-- 2. pesagem_itens (parent: pesagens)
DROP POLICY IF EXISTS "Users can delete pesagem_itens" ON public.pesagem_itens;
DROP POLICY IF EXISTS "Users can insert pesagem_itens" ON public.pesagem_itens;
DROP POLICY IF EXISTS "Users can update pesagem_itens" ON public.pesagem_itens;
DROP POLICY IF EXISTS "Users can view pesagem_itens" ON public.pesagem_itens;

CREATE POLICY "Users can delete pesagem_itens" ON public.pesagem_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pesagens p
    WHERE p.id = pesagem_itens.pesagem_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert pesagem_itens" ON public.pesagem_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pesagens p
    WHERE p.id = pesagem_itens.pesagem_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update pesagem_itens" ON public.pesagem_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.pesagens p
    WHERE p.id = pesagem_itens.pesagem_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view pesagem_itens" ON public.pesagem_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pesagens p
    WHERE p.id = pesagem_itens.pesagem_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

-- 3. ordens_compra_itens (parent: ordens_compra)
DROP POLICY IF EXISTS "Users can delete ordens_compra_itens" ON public.ordens_compra_itens;
DROP POLICY IF EXISTS "Users can insert ordens_compra_itens" ON public.ordens_compra_itens;
DROP POLICY IF EXISTS "Users can update ordens_compra_itens" ON public.ordens_compra_itens;
DROP POLICY IF EXISTS "Users can view ordens_compra_itens" ON public.ordens_compra_itens;

CREATE POLICY "Users can delete ordens_compra_itens" ON public.ordens_compra_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.ordens_compra oc
    WHERE oc.id = ordens_compra_itens.ordem_compra_id
    AND oc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert ordens_compra_itens" ON public.ordens_compra_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ordens_compra oc
    WHERE oc.id = ordens_compra_itens.ordem_compra_id
    AND oc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update ordens_compra_itens" ON public.ordens_compra_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.ordens_compra oc
    WHERE oc.id = ordens_compra_itens.ordem_compra_id
    AND oc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view ordens_compra_itens" ON public.ordens_compra_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ordens_compra oc
    WHERE oc.id = ordens_compra_itens.ordem_compra_id
    AND oc.integrado_id = get_my_integrado_id()
  )
);

-- 4. recebimento_itens (parent: recebimentos_mercadoria)
DROP POLICY IF EXISTS "Users can delete recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can insert recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can update recebimento_itens" ON public.recebimento_itens;
DROP POLICY IF EXISTS "Users can view recebimento_itens" ON public.recebimento_itens;

CREATE POLICY "Users can delete recebimento_itens" ON public.recebimento_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = recebimento_itens.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert recebimento_itens" ON public.recebimento_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = recebimento_itens.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update recebimento_itens" ON public.recebimento_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = recebimento_itens.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view recebimento_itens" ON public.recebimento_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = recebimento_itens.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

-- 5. divergencias_recebimento (parent: recebimentos_mercadoria)
DROP POLICY IF EXISTS "Users can delete divergencias_recebimento" ON public.divergencias_recebimento;
DROP POLICY IF EXISTS "Users can insert divergencias_recebimento" ON public.divergencias_recebimento;
DROP POLICY IF EXISTS "Users can update divergencias_recebimento" ON public.divergencias_recebimento;
DROP POLICY IF EXISTS "Users can view divergencias_recebimento" ON public.divergencias_recebimento;

CREATE POLICY "Users can delete divergencias_recebimento" ON public.divergencias_recebimento
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = divergencias_recebimento.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert divergencias_recebimento" ON public.divergencias_recebimento
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = divergencias_recebimento.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update divergencias_recebimento" ON public.divergencias_recebimento
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = divergencias_recebimento.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view divergencias_recebimento" ON public.divergencias_recebimento
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.recebimentos_mercadoria rm
    WHERE rm.id = divergencias_recebimento.recebimento_id
    AND rm.integrado_id = get_my_integrado_id()
  )
);

-- 6. ordens_producao_itens (parent: ordens_producao)
DROP POLICY IF EXISTS "Users can delete ordens_producao_itens" ON public.ordens_producao_itens;
DROP POLICY IF EXISTS "Users can insert ordens_producao_itens" ON public.ordens_producao_itens;
DROP POLICY IF EXISTS "Users can update ordens_producao_itens" ON public.ordens_producao_itens;
DROP POLICY IF EXISTS "Users can view ordens_producao_itens" ON public.ordens_producao_itens;

CREATE POLICY "Users can delete ordens_producao_itens" ON public.ordens_producao_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_producao_id
    AND op.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert ordens_producao_itens" ON public.ordens_producao_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_producao_id
    AND op.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update ordens_producao_itens" ON public.ordens_producao_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_producao_id
    AND op.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view ordens_producao_itens" ON public.ordens_producao_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ordens_producao op
    WHERE op.id = ordens_producao_itens.ordem_producao_id
    AND op.integrado_id = get_my_integrado_id()
  )
);

-- 7. tabelas_preco_itens (parent: tabelas_preco)
DROP POLICY IF EXISTS "Users can delete tabelas_preco_itens" ON public.tabelas_preco_itens;
DROP POLICY IF EXISTS "Users can insert tabelas_preco_itens" ON public.tabelas_preco_itens;
DROP POLICY IF EXISTS "Users can update tabelas_preco_itens" ON public.tabelas_preco_itens;
DROP POLICY IF EXISTS "Users can view tabelas_preco_itens" ON public.tabelas_preco_itens;

CREATE POLICY "Users can delete tabelas_preco_itens" ON public.tabelas_preco_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tabelas_preco tp
    WHERE tp.id = tabelas_preco_itens.tabela_preco_id
    AND tp.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert tabelas_preco_itens" ON public.tabelas_preco_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tabelas_preco tp
    WHERE tp.id = tabelas_preco_itens.tabela_preco_id
    AND tp.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update tabelas_preco_itens" ON public.tabelas_preco_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.tabelas_preco tp
    WHERE tp.id = tabelas_preco_itens.tabela_preco_id
    AND tp.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view tabelas_preco_itens" ON public.tabelas_preco_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tabelas_preco tp
    WHERE tp.id = tabelas_preco_itens.tabela_preco_id
    AND tp.integrado_id = get_my_integrado_id()
  )
);

-- 8. pedido_itens (parent: pedidos)
DROP POLICY IF EXISTS "Users can delete pedido_itens" ON public.pedido_itens;
DROP POLICY IF EXISTS "Users can insert pedido_itens" ON public.pedido_itens;
DROP POLICY IF EXISTS "Users can update pedido_itens" ON public.pedido_itens;
DROP POLICY IF EXISTS "Users can view pedido_itens" ON public.pedido_itens;

CREATE POLICY "Users can delete pedido_itens" ON public.pedido_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert pedido_itens" ON public.pedido_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update pedido_itens" ON public.pedido_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view pedido_itens" ON public.pedido_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

-- 9. separacao_pedidos (parent: pedidos)
DROP POLICY IF EXISTS "Users can delete separacao_pedidos" ON public.separacao_pedidos;
DROP POLICY IF EXISTS "Users can insert separacao_pedidos" ON public.separacao_pedidos;
DROP POLICY IF EXISTS "Users can update separacao_pedidos" ON public.separacao_pedidos;
DROP POLICY IF EXISTS "Users can view separacao_pedidos" ON public.separacao_pedidos;

CREATE POLICY "Users can delete separacao_pedidos" ON public.separacao_pedidos
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = separacao_pedidos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert separacao_pedidos" ON public.separacao_pedidos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = separacao_pedidos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update separacao_pedidos" ON public.separacao_pedidos
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = separacao_pedidos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view separacao_pedidos" ON public.separacao_pedidos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = separacao_pedidos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

-- 10. credito_cliente_formas (parent: credito_cliente)
DROP POLICY IF EXISTS "Users can delete credito_cliente_formas" ON public.credito_cliente_formas;
DROP POLICY IF EXISTS "Users can insert credito_cliente_formas" ON public.credito_cliente_formas;
DROP POLICY IF EXISTS "Users can update credito_cliente_formas" ON public.credito_cliente_formas;
DROP POLICY IF EXISTS "Users can view credito_cliente_formas" ON public.credito_cliente_formas;

CREATE POLICY "Users can delete credito_cliente_formas" ON public.credito_cliente_formas
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.credito_cliente cc
    WHERE cc.id = credito_cliente_formas.credito_cliente_id
    AND cc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert credito_cliente_formas" ON public.credito_cliente_formas
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.credito_cliente cc
    WHERE cc.id = credito_cliente_formas.credito_cliente_id
    AND cc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update credito_cliente_formas" ON public.credito_cliente_formas
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.credito_cliente cc
    WHERE cc.id = credito_cliente_formas.credito_cliente_id
    AND cc.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view credito_cliente_formas" ON public.credito_cliente_formas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.credito_cliente cc
    WHERE cc.id = credito_cliente_formas.credito_cliente_id
    AND cc.integrado_id = get_my_integrado_id()
  )
);

-- 11. pedido_itens_ovos (parent: pedidos)
DROP POLICY IF EXISTS "Users can delete pedido_itens_ovos" ON public.pedido_itens_ovos;
DROP POLICY IF EXISTS "Users can insert pedido_itens_ovos" ON public.pedido_itens_ovos;
DROP POLICY IF EXISTS "Users can update pedido_itens_ovos" ON public.pedido_itens_ovos;
DROP POLICY IF EXISTS "Users can view pedido_itens_ovos" ON public.pedido_itens_ovos;

CREATE POLICY "Users can delete pedido_itens_ovos" ON public.pedido_itens_ovos
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens_ovos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert pedido_itens_ovos" ON public.pedido_itens_ovos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens_ovos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update pedido_itens_ovos" ON public.pedido_itens_ovos
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens_ovos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view pedido_itens_ovos" ON public.pedido_itens_ovos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens_ovos.pedido_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

-- 12. reserva_estoque_ovos (parent chain: pedido_itens_ovos -> pedidos)
DROP POLICY IF EXISTS "Users can delete reserva_estoque_ovos" ON public.reserva_estoque_ovos;
DROP POLICY IF EXISTS "Users can insert reserva_estoque_ovos" ON public.reserva_estoque_ovos;
DROP POLICY IF EXISTS "Users can view reserva_estoque_ovos" ON public.reserva_estoque_ovos;

CREATE POLICY "Users can delete reserva_estoque_ovos" ON public.reserva_estoque_ovos
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.pedido_itens_ovos pio
    JOIN public.pedidos p ON p.id = pio.pedido_id
    WHERE pio.id = reserva_estoque_ovos.pedido_item_ovo_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can insert reserva_estoque_ovos" ON public.reserva_estoque_ovos
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedido_itens_ovos pio
    JOIN public.pedidos p ON p.id = pio.pedido_id
    WHERE pio.id = reserva_estoque_ovos.pedido_item_ovo_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view reserva_estoque_ovos" ON public.reserva_estoque_ovos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.pedido_itens_ovos pio
    JOIN public.pedidos p ON p.id = pio.pedido_id
    WHERE pio.id = reserva_estoque_ovos.pedido_item_ovo_id
    AND p.integrado_id = get_my_integrado_id()
  )
);

-- 13. galpoes (parent: nucleos)
DROP POLICY IF EXISTS "Users can insert galpoes" ON public.galpoes;
DROP POLICY IF EXISTS "Users can update galpoes" ON public.galpoes;
DROP POLICY IF EXISTS "Users can view galpoes" ON public.galpoes;

CREATE POLICY "Users can insert galpoes" ON public.galpoes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nucleos n
    WHERE n.id = galpoes.nucleo_id
    AND n.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can update galpoes" ON public.galpoes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.nucleos n
    WHERE n.id = galpoes.nucleo_id
    AND n.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can view galpoes" ON public.galpoes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.nucleos n
    WHERE n.id = galpoes.nucleo_id
    AND n.integrado_id = get_my_integrado_id()
  )
);

CREATE POLICY "Users can delete galpoes for org" ON public.galpoes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.nucleos n
    WHERE n.id = galpoes.nucleo_id
    AND n.integrado_id = get_my_integrado_id()
  )
);

-- 14. produtos_animais (fix DELETE policy)
DROP POLICY IF EXISTS "Users can delete produtos_animais" ON public.produtos_animais;

CREATE POLICY "Users can delete produtos_animais for org" ON public.produtos_animais
FOR DELETE USING (integrado_id = get_my_integrado_id());

-- 15. produtos_ovos (fix DELETE policy)
DROP POLICY IF EXISTS "Users can delete produtos_ovos" ON public.produtos_ovos;

CREATE POLICY "Users can delete produtos_ovos for org" ON public.produtos_ovos
FOR DELETE USING (integrado_id = get_my_integrado_id());

-- Fix SECURITY DEFINER functions to validate integrado_id

-- Fix gerar_lote_interno_ovos to validate caller owns the integrado_id
CREATE OR REPLACE FUNCTION public.gerar_lote_interno_ovos(p_integrado_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
  v_lote TEXT;
BEGIN
  -- Validate that the caller owns this integrado_id
  IF p_integrado_id != get_my_integrado_id() THEN
    RAISE EXCEPTION 'Access denied: integrado_id mismatch';
  END IF;

  v_ano := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next sequence for this year and integrado
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

-- Fix reservar_estoque_ovos_fifo to validate caller owns the integrado_id
CREATE OR REPLACE FUNCTION public.reservar_estoque_ovos_fifo(
  p_integrado_id uuid, 
  p_tipo_ovo tipo_ovo, 
  p_classificacao classificacao_peso_ovo, 
  p_quantidade_unidades integer, 
  p_pedido_item_ovo_id uuid
)
RETURNS TABLE(estoque_id uuid, lote_interno text, quantidade_reservada integer, data_producao date, data_validade date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restante INTEGER := p_quantidade_unidades;
  v_estoque RECORD;
  v_reserva INTEGER;
BEGIN
  -- Validate that the caller owns this integrado_id
  IF p_integrado_id != get_my_integrado_id() THEN
    RAISE EXCEPTION 'Access denied: integrado_id mismatch';
  END IF;

  -- Fetch available stock in FIFO order (oldest first)
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
    
    -- Calculate quantity to reserve from this lot
    v_reserva := LEAST(v_estoque.disponivel, v_restante);
    
    -- Update reserved quantity in stock
    UPDATE public.estoque_ovos
    SET quantidade_reservada = quantidade_reservada + v_reserva
    WHERE id = v_estoque.id;
    
    -- Insert reservation record
    INSERT INTO public.reserva_estoque_ovos (
      pedido_item_ovo_id, estoque_ovo_id, quantidade_reservada,
      lote_interno, data_producao, data_validade
    ) VALUES (
      p_pedido_item_ovo_id, v_estoque.id, v_reserva,
      v_estoque.lote_interno, v_estoque.data_producao, v_estoque.data_validade
    );
    
    -- Return reservation info
    estoque_id := v_estoque.id;
    lote_interno := v_estoque.lote_interno;
    quantidade_reservada := v_reserva;
    data_producao := v_estoque.data_producao;
    data_validade := v_estoque.data_validade;
    RETURN NEXT;
    
    v_restante := v_restante - v_reserva;
  END LOOP;
  
  -- If couldn't reserve everything, return warning
  IF v_restante > 0 THEN
    RAISE WARNING 'Estoque insuficiente. Faltam % unidades', v_restante;
  END IF;
  
  RETURN;
END;
$$;