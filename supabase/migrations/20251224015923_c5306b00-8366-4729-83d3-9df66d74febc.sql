-- =========================================
-- FUNÇÃO PARA RESOLVER O INTEGRADO_ID DO USUÁRIO ATUAL
-- =========================================
CREATE OR REPLACE FUNCTION public.get_my_integrado_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT integrado_id FROM public.profiles WHERE id = auth.uid()),
    auth.uid()
  )
$$;

-- =========================================
-- ADICIONAR integrado_id A producao_logs
-- =========================================
ALTER TABLE public.producao_logs ADD COLUMN IF NOT EXISTS integrado_id uuid;

-- =========================================
-- ATUALIZAR RLS - PARTE 1 (areas até grupos_produto)
-- =========================================

-- areas
DROP POLICY IF EXISTS "Users can view areas" ON public.areas;
DROP POLICY IF EXISTS "Users can insert areas" ON public.areas;
DROP POLICY IF EXISTS "Users can update areas" ON public.areas;
CREATE POLICY "Users can view areas by org" ON public.areas FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert areas for org" ON public.areas FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update areas for org" ON public.areas FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- categorias
DROP POLICY IF EXISTS "Users can view categorias" ON public.categorias;
DROP POLICY IF EXISTS "Users can insert categorias" ON public.categorias;
DROP POLICY IF EXISTS "Users can update categorias" ON public.categorias;
CREATE POLICY "Users can view categorias by org" ON public.categorias FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert categorias for org" ON public.categorias FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update categorias for org" ON public.categorias FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- centro_custos
DROP POLICY IF EXISTS "Users can view centro_custos" ON public.centro_custos;
DROP POLICY IF EXISTS "Users can insert centro_custos" ON public.centro_custos;
DROP POLICY IF EXISTS "Users can update centro_custos" ON public.centro_custos;
DROP POLICY IF EXISTS "Users can delete centro_custos" ON public.centro_custos;
CREATE POLICY "Users can view centro_custos by org" ON public.centro_custos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert centro_custos for org" ON public.centro_custos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update centro_custos for org" ON public.centro_custos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete centro_custos for org" ON public.centro_custos FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- config_producao
DROP POLICY IF EXISTS "Users can view config_producao" ON public.config_producao;
DROP POLICY IF EXISTS "Users can insert config_producao" ON public.config_producao;
DROP POLICY IF EXISTS "Users can update config_producao" ON public.config_producao;
CREATE POLICY "Users can view config_producao by org" ON public.config_producao FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert config_producao for org" ON public.config_producao FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update config_producao for org" ON public.config_producao FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- contas_bancarias
DROP POLICY IF EXISTS "Users can view contas_bancarias" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can insert contas_bancarias" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can update contas_bancarias" ON public.contas_bancarias;
DROP POLICY IF EXISTS "Users can delete contas_bancarias" ON public.contas_bancarias;
CREATE POLICY "Users can view contas_bancarias by org" ON public.contas_bancarias FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert contas_bancarias for org" ON public.contas_bancarias FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update contas_bancarias for org" ON public.contas_bancarias FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete contas_bancarias for org" ON public.contas_bancarias FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- contas_pagar
DROP POLICY IF EXISTS "Users can view contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Users can insert contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Users can update contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Users can delete contas_pagar" ON public.contas_pagar;
CREATE POLICY "Users can view contas_pagar by org" ON public.contas_pagar FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert contas_pagar for org" ON public.contas_pagar FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update contas_pagar for org" ON public.contas_pagar FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete contas_pagar for org" ON public.contas_pagar FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- contas_receber
DROP POLICY IF EXISTS "Users can view contas_receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Users can insert contas_receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Users can update contas_receber" ON public.contas_receber;
DROP POLICY IF EXISTS "Users can delete contas_receber" ON public.contas_receber;
CREATE POLICY "Users can view contas_receber by org" ON public.contas_receber FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert contas_receber for org" ON public.contas_receber FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update contas_receber for org" ON public.contas_receber FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete contas_receber for org" ON public.contas_receber FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- credito_cliente
DROP POLICY IF EXISTS "Users can view credito_cliente" ON public.credito_cliente;
DROP POLICY IF EXISTS "Users can insert credito_cliente" ON public.credito_cliente;
DROP POLICY IF EXISTS "Users can update credito_cliente" ON public.credito_cliente;
DROP POLICY IF EXISTS "Users can delete credito_cliente" ON public.credito_cliente;
CREATE POLICY "Users can view credito_cliente by org" ON public.credito_cliente FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert credito_cliente for org" ON public.credito_cliente FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update credito_cliente for org" ON public.credito_cliente FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete credito_cliente for org" ON public.credito_cliente FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- equipamentos_producao
DROP POLICY IF EXISTS "Users can view equipamentos_producao" ON public.equipamentos_producao;
DROP POLICY IF EXISTS "Users can insert equipamentos_producao" ON public.equipamentos_producao;
DROP POLICY IF EXISTS "Users can update equipamentos_producao" ON public.equipamentos_producao;
DROP POLICY IF EXISTS "Users can delete equipamentos_producao" ON public.equipamentos_producao;
CREATE POLICY "Users can view equipamentos_producao by org" ON public.equipamentos_producao FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert equipamentos_producao for org" ON public.equipamentos_producao FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update equipamentos_producao for org" ON public.equipamentos_producao FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete equipamentos_producao for org" ON public.equipamentos_producao FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- estoque_ovos
DROP POLICY IF EXISTS "Users can view estoque_ovos" ON public.estoque_ovos;
DROP POLICY IF EXISTS "Users can insert estoque_ovos" ON public.estoque_ovos;
DROP POLICY IF EXISTS "Users can update estoque_ovos" ON public.estoque_ovos;
DROP POLICY IF EXISTS "Users can delete estoque_ovos" ON public.estoque_ovos;
CREATE POLICY "Users can view estoque_ovos by org" ON public.estoque_ovos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert estoque_ovos for org" ON public.estoque_ovos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update estoque_ovos for org" ON public.estoque_ovos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete estoque_ovos for org" ON public.estoque_ovos FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- fases_animal
DROP POLICY IF EXISTS "Users can view fases_animal" ON public.fases_animal;
DROP POLICY IF EXISTS "Users can insert fases_animal" ON public.fases_animal;
DROP POLICY IF EXISTS "Users can update fases_animal" ON public.fases_animal;
DROP POLICY IF EXISTS "Users can delete fases_animal" ON public.fases_animal;
CREATE POLICY "Users can view fases_animal by org" ON public.fases_animal FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert fases_animal for org" ON public.fases_animal FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update fases_animal for org" ON public.fases_animal FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete fases_animal for org" ON public.fases_animal FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- fechamento_lotes
DROP POLICY IF EXISTS "Users can view fechamento_lotes" ON public.fechamento_lotes;
DROP POLICY IF EXISTS "Users can insert fechamento_lotes" ON public.fechamento_lotes;
DROP POLICY IF EXISTS "Users can update fechamento_lotes" ON public.fechamento_lotes;
CREATE POLICY "Users can view fechamento_lotes by org" ON public.fechamento_lotes FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert fechamento_lotes for org" ON public.fechamento_lotes FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update fechamento_lotes for org" ON public.fechamento_lotes FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- formas_pagamento
DROP POLICY IF EXISTS "Users can view formas_pagamento" ON public.formas_pagamento;
DROP POLICY IF EXISTS "Users can insert formas_pagamento" ON public.formas_pagamento;
DROP POLICY IF EXISTS "Users can update formas_pagamento" ON public.formas_pagamento;
DROP POLICY IF EXISTS "Users can delete formas_pagamento" ON public.formas_pagamento;
CREATE POLICY "Users can view formas_pagamento by org" ON public.formas_pagamento FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert formas_pagamento for org" ON public.formas_pagamento FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update formas_pagamento for org" ON public.formas_pagamento FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete formas_pagamento for org" ON public.formas_pagamento FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- grupos_animal
DROP POLICY IF EXISTS "Users can view grupos_animal" ON public.grupos_animal;
DROP POLICY IF EXISTS "Users can insert grupos_animal" ON public.grupos_animal;
DROP POLICY IF EXISTS "Users can update grupos_animal" ON public.grupos_animal;
CREATE POLICY "Users can view grupos_animal by org" ON public.grupos_animal FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert grupos_animal for org" ON public.grupos_animal FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update grupos_animal for org" ON public.grupos_animal FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- grupos_produto
DROP POLICY IF EXISTS "Users can view grupos_produto" ON public.grupos_produto;
DROP POLICY IF EXISTS "Users can insert grupos_produto" ON public.grupos_produto;
DROP POLICY IF EXISTS "Users can update grupos_produto" ON public.grupos_produto;
CREATE POLICY "Users can view grupos_produto by org" ON public.grupos_produto FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert grupos_produto for org" ON public.grupos_produto FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update grupos_produto for org" ON public.grupos_produto FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- kardex
DROP POLICY IF EXISTS "Users can view kardex" ON public.kardex;
DROP POLICY IF EXISTS "Users can insert kardex" ON public.kardex;
CREATE POLICY "Users can view kardex by org" ON public.kardex FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert kardex for org" ON public.kardex FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());

-- kardex_ovos
DROP POLICY IF EXISTS "Users can view kardex_ovos" ON public.kardex_ovos;
DROP POLICY IF EXISTS "Users can insert kardex_ovos" ON public.kardex_ovos;
CREATE POLICY "Users can view kardex_ovos by org" ON public.kardex_ovos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert kardex_ovos for org" ON public.kardex_ovos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());

-- lotes
DROP POLICY IF EXISTS "Users can view lotes" ON public.lotes;
DROP POLICY IF EXISTS "Users can insert lotes" ON public.lotes;
DROP POLICY IF EXISTS "Users can update lotes" ON public.lotes;
CREATE POLICY "Users can view lotes by org" ON public.lotes FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert lotes for org" ON public.lotes FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update lotes for org" ON public.lotes FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- medicamentos_config
DROP POLICY IF EXISTS "Users can view medicamentos_config" ON public.medicamentos_config;
DROP POLICY IF EXISTS "Users can insert medicamentos_config" ON public.medicamentos_config;
DROP POLICY IF EXISTS "Users can update medicamentos_config" ON public.medicamentos_config;
DROP POLICY IF EXISTS "Users can delete medicamentos_config" ON public.medicamentos_config;
CREATE POLICY "Users can view medicamentos_config by org" ON public.medicamentos_config FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert medicamentos_config for org" ON public.medicamentos_config FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update medicamentos_config for org" ON public.medicamentos_config FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete medicamentos_config for org" ON public.medicamentos_config FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- metas_peso
DROP POLICY IF EXISTS "Users can view metas_peso" ON public.metas_peso;
DROP POLICY IF EXISTS "Users can insert metas_peso" ON public.metas_peso;
DROP POLICY IF EXISTS "Users can update metas_peso" ON public.metas_peso;
CREATE POLICY "Users can view metas_peso by org" ON public.metas_peso FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert metas_peso for org" ON public.metas_peso FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update metas_peso for org" ON public.metas_peso FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- metas_postura
DROP POLICY IF EXISTS "Users can view metas_postura" ON public.metas_postura;
DROP POLICY IF EXISTS "Users can insert metas_postura" ON public.metas_postura;
DROP POLICY IF EXISTS "Users can update metas_postura" ON public.metas_postura;
CREATE POLICY "Users can view metas_postura by org" ON public.metas_postura FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert metas_postura for org" ON public.metas_postura FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update metas_postura for org" ON public.metas_postura FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- mortalidade
DROP POLICY IF EXISTS "Users can view mortalidade" ON public.mortalidade;
DROP POLICY IF EXISTS "Users can insert mortalidade" ON public.mortalidade;
DROP POLICY IF EXISTS "Users can update mortalidade" ON public.mortalidade;
DROP POLICY IF EXISTS "Users can delete mortalidade" ON public.mortalidade;
CREATE POLICY "Users can view mortalidade by org" ON public.mortalidade FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert mortalidade for org" ON public.mortalidade FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update mortalidade for org" ON public.mortalidade FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete mortalidade for org" ON public.mortalidade FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- mortalidade_media
DROP POLICY IF EXISTS "Users can view mortalidade_media" ON public.mortalidade_media;
DROP POLICY IF EXISTS "Users can insert mortalidade_media" ON public.mortalidade_media;
DROP POLICY IF EXISTS "Users can update mortalidade_media" ON public.mortalidade_media;
CREATE POLICY "Users can view mortalidade_media by org" ON public.mortalidade_media FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert mortalidade_media for org" ON public.mortalidade_media FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update mortalidade_media for org" ON public.mortalidade_media FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- movimentacoes_bancarias
DROP POLICY IF EXISTS "Users can view movimentacoes_bancarias" ON public.movimentacoes_bancarias;
DROP POLICY IF EXISTS "Users can insert movimentacoes_bancarias" ON public.movimentacoes_bancarias;
DROP POLICY IF EXISTS "Users can update movimentacoes_bancarias" ON public.movimentacoes_bancarias;
DROP POLICY IF EXISTS "Users can delete movimentacoes_bancarias" ON public.movimentacoes_bancarias;
CREATE POLICY "Users can view movimentacoes_bancarias by org" ON public.movimentacoes_bancarias FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert movimentacoes_bancarias for org" ON public.movimentacoes_bancarias FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update movimentacoes_bancarias for org" ON public.movimentacoes_bancarias FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete movimentacoes_bancarias for org" ON public.movimentacoes_bancarias FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- nucleos
DROP POLICY IF EXISTS "Users can view nucleos" ON public.nucleos;
DROP POLICY IF EXISTS "Users can insert nucleos" ON public.nucleos;
DROP POLICY IF EXISTS "Users can update nucleos" ON public.nucleos;
CREATE POLICY "Users can view nucleos by org" ON public.nucleos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert nucleos for org" ON public.nucleos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update nucleos for org" ON public.nucleos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- nutricao_itens
DROP POLICY IF EXISTS "Users can view nutricao_itens" ON public.nutricao_itens;
DROP POLICY IF EXISTS "Users can insert nutricao_itens" ON public.nutricao_itens;
DROP POLICY IF EXISTS "Users can update nutricao_itens" ON public.nutricao_itens;
DROP POLICY IF EXISTS "Users can delete nutricao_itens" ON public.nutricao_itens;
CREATE POLICY "Users can view nutricao_itens by org" ON public.nutricao_itens FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert nutricao_itens for org" ON public.nutricao_itens FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update nutricao_itens for org" ON public.nutricao_itens FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete nutricao_itens for org" ON public.nutricao_itens FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- nutricoes
DROP POLICY IF EXISTS "Users can view nutricoes" ON public.nutricoes;
DROP POLICY IF EXISTS "Users can insert nutricoes" ON public.nutricoes;
DROP POLICY IF EXISTS "Users can update nutricoes" ON public.nutricoes;
DROP POLICY IF EXISTS "Users can delete nutricoes" ON public.nutricoes;
CREATE POLICY "Users can view nutricoes by org" ON public.nutricoes FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert nutricoes for org" ON public.nutricoes FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update nutricoes for org" ON public.nutricoes FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete nutricoes for org" ON public.nutricoes FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- observacoes_lote
DROP POLICY IF EXISTS "Users can view observacoes_lote" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can insert observacoes_lote" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can update observacoes_lote" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can delete observacoes_lote" ON public.observacoes_lote;
CREATE POLICY "Users can view observacoes_lote by org" ON public.observacoes_lote FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert observacoes_lote for org" ON public.observacoes_lote FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update observacoes_lote for org" ON public.observacoes_lote FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete observacoes_lote for org" ON public.observacoes_lote FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- ordens_compra
DROP POLICY IF EXISTS "Users can view ordens_compra" ON public.ordens_compra;
DROP POLICY IF EXISTS "Users can insert ordens_compra" ON public.ordens_compra;
DROP POLICY IF EXISTS "Users can update ordens_compra" ON public.ordens_compra;
DROP POLICY IF EXISTS "Users can delete ordens_compra" ON public.ordens_compra;
CREATE POLICY "Users can view ordens_compra by org" ON public.ordens_compra FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert ordens_compra for org" ON public.ordens_compra FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update ordens_compra for org" ON public.ordens_compra FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete ordens_compra for org" ON public.ordens_compra FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- ordens_producao
DROP POLICY IF EXISTS "Users can view ordens_producao" ON public.ordens_producao;
DROP POLICY IF EXISTS "Users can insert ordens_producao" ON public.ordens_producao;
DROP POLICY IF EXISTS "Users can update ordens_producao" ON public.ordens_producao;
DROP POLICY IF EXISTS "Users can delete ordens_producao" ON public.ordens_producao;
CREATE POLICY "Users can view ordens_producao by org" ON public.ordens_producao FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert ordens_producao for org" ON public.ordens_producao FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update ordens_producao for org" ON public.ordens_producao FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete ordens_producao for org" ON public.ordens_producao FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- organizacoes
DROP POLICY IF EXISTS "Users can view organizacoes" ON public.organizacoes;
DROP POLICY IF EXISTS "Users can insert organizacoes" ON public.organizacoes;
DROP POLICY IF EXISTS "Users can update organizacoes" ON public.organizacoes;
CREATE POLICY "Users can view organizacoes by org" ON public.organizacoes FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert organizacoes for org" ON public.organizacoes FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update organizacoes for org" ON public.organizacoes FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- parceiros
DROP POLICY IF EXISTS "Users can view parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Users can insert parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Users can update parceiros" ON public.parceiros;
CREATE POLICY "Users can view parceiros by org" ON public.parceiros FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert parceiros for org" ON public.parceiros FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update parceiros for org" ON public.parceiros FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- pedidos
DROP POLICY IF EXISTS "Users can view pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can insert pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can update pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can delete pedidos" ON public.pedidos;
CREATE POLICY "Users can view pedidos by org" ON public.pedidos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert pedidos for org" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update pedidos for org" ON public.pedidos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete pedidos for org" ON public.pedidos FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- pesagens
DROP POLICY IF EXISTS "Users can view pesagens" ON public.pesagens;
DROP POLICY IF EXISTS "Users can insert pesagens" ON public.pesagens;
DROP POLICY IF EXISTS "Users can update pesagens" ON public.pesagens;
DROP POLICY IF EXISTS "Users can delete pesagens" ON public.pesagens;
CREATE POLICY "Users can view pesagens by org" ON public.pesagens FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert pesagens for org" ON public.pesagens FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update pesagens for org" ON public.pesagens FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete pesagens for org" ON public.pesagens FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- plano_contas
DROP POLICY IF EXISTS "Users can view plano_contas" ON public.plano_contas;
DROP POLICY IF EXISTS "Users can insert plano_contas" ON public.plano_contas;
DROP POLICY IF EXISTS "Users can update plano_contas" ON public.plano_contas;
DROP POLICY IF EXISTS "Users can delete plano_contas" ON public.plano_contas;
CREATE POLICY "Users can view plano_contas by org" ON public.plano_contas FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert plano_contas for org" ON public.plano_contas FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update plano_contas for org" ON public.plano_contas FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete plano_contas for org" ON public.plano_contas FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- prazos_pagamento
DROP POLICY IF EXISTS "Users can view prazos_pagamento" ON public.prazos_pagamento;
DROP POLICY IF EXISTS "Users can insert prazos_pagamento" ON public.prazos_pagamento;
DROP POLICY IF EXISTS "Users can update prazos_pagamento" ON public.prazos_pagamento;
DROP POLICY IF EXISTS "Users can delete prazos_pagamento" ON public.prazos_pagamento;
CREATE POLICY "Users can view prazos_pagamento by org" ON public.prazos_pagamento FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert prazos_pagamento for org" ON public.prazos_pagamento FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update prazos_pagamento for org" ON public.prazos_pagamento FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete prazos_pagamento for org" ON public.prazos_pagamento FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- producao_ovos
DROP POLICY IF EXISTS "Users can view producao_ovos" ON public.producao_ovos;
DROP POLICY IF EXISTS "Users can insert producao_ovos" ON public.producao_ovos;
DROP POLICY IF EXISTS "Users can update producao_ovos" ON public.producao_ovos;
DROP POLICY IF EXISTS "Users can delete producao_ovos" ON public.producao_ovos;
CREATE POLICY "Users can view producao_ovos by org" ON public.producao_ovos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert producao_ovos for org" ON public.producao_ovos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update producao_ovos for org" ON public.producao_ovos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete producao_ovos for org" ON public.producao_ovos FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- produto_formulacao
DROP POLICY IF EXISTS "Users can view produto_formulacao" ON public.produto_formulacao;
DROP POLICY IF EXISTS "Users can insert produto_formulacao" ON public.produto_formulacao;
DROP POLICY IF EXISTS "Users can update produto_formulacao" ON public.produto_formulacao;
DROP POLICY IF EXISTS "Users can delete produto_formulacao" ON public.produto_formulacao;
CREATE POLICY "Users can view produto_formulacao by org" ON public.produto_formulacao FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert produto_formulacao for org" ON public.produto_formulacao FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update produto_formulacao for org" ON public.produto_formulacao FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete produto_formulacao for org" ON public.produto_formulacao FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- produto_fornecedor
DROP POLICY IF EXISTS "Users can view produto_fornecedor" ON public.produto_fornecedor;
DROP POLICY IF EXISTS "Users can insert produto_fornecedor" ON public.produto_fornecedor;
DROP POLICY IF EXISTS "Users can update produto_fornecedor" ON public.produto_fornecedor;
DROP POLICY IF EXISTS "Users can delete produto_fornecedor" ON public.produto_fornecedor;
CREATE POLICY "Users can view produto_fornecedor by org" ON public.produto_fornecedor FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert produto_fornecedor for org" ON public.produto_fornecedor FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update produto_fornecedor for org" ON public.produto_fornecedor FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete produto_fornecedor for org" ON public.produto_fornecedor FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- produtos
DROP POLICY IF EXISTS "Users can view produtos" ON public.produtos;
DROP POLICY IF EXISTS "Users can insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "Users can update produtos" ON public.produtos;
CREATE POLICY "Users can view produtos by org" ON public.produtos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert produtos for org" ON public.produtos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update produtos for org" ON public.produtos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- produtos_animais
DROP POLICY IF EXISTS "Users can view produtos_animais" ON public.produtos_animais;
DROP POLICY IF EXISTS "Users can insert produtos_animais" ON public.produtos_animais;
DROP POLICY IF EXISTS "Users can update produtos_animais" ON public.produtos_animais;
CREATE POLICY "Users can view produtos_animais by org" ON public.produtos_animais FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert produtos_animais for org" ON public.produtos_animais FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update produtos_animais for org" ON public.produtos_animais FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- produtos_ovos
DROP POLICY IF EXISTS "Users can view produtos_ovos" ON public.produtos_ovos;
DROP POLICY IF EXISTS "Users can insert produtos_ovos" ON public.produtos_ovos;
DROP POLICY IF EXISTS "Users can update produtos_ovos" ON public.produtos_ovos;
CREATE POLICY "Users can view produtos_ovos by org" ON public.produtos_ovos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert produtos_ovos for org" ON public.produtos_ovos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update produtos_ovos for org" ON public.produtos_ovos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());

-- profiles - Política especial
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view profiles in org" ON public.profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated 
  WITH CHECK (id = auth.uid());

-- recebimento_lotes
DROP POLICY IF EXISTS "Users can view recebimento_lotes" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can insert recebimento_lotes" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can update recebimento_lotes" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can delete recebimento_lotes" ON public.recebimento_lotes;
CREATE POLICY "Users can view recebimento_lotes by org" ON public.recebimento_lotes FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert recebimento_lotes for org" ON public.recebimento_lotes FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update recebimento_lotes for org" ON public.recebimento_lotes FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete recebimento_lotes for org" ON public.recebimento_lotes FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- recebimentos_mercadoria
DROP POLICY IF EXISTS "Users can view recebimentos_mercadoria" ON public.recebimentos_mercadoria;
DROP POLICY IF EXISTS "Users can insert recebimentos_mercadoria" ON public.recebimentos_mercadoria;
DROP POLICY IF EXISTS "Users can update recebimentos_mercadoria" ON public.recebimentos_mercadoria;
DROP POLICY IF EXISTS "Users can delete recebimentos_mercadoria" ON public.recebimentos_mercadoria;
CREATE POLICY "Users can view recebimentos_mercadoria by org" ON public.recebimentos_mercadoria FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert recebimentos_mercadoria for org" ON public.recebimentos_mercadoria FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update recebimentos_mercadoria for org" ON public.recebimentos_mercadoria FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete recebimentos_mercadoria for org" ON public.recebimentos_mercadoria FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- solicitacoes_racao
DROP POLICY IF EXISTS "Users can view solicitacoes_racao" ON public.solicitacoes_racao;
DROP POLICY IF EXISTS "Users can insert solicitacoes_racao" ON public.solicitacoes_racao;
DROP POLICY IF EXISTS "Users can update solicitacoes_racao" ON public.solicitacoes_racao;
DROP POLICY IF EXISTS "Users can delete solicitacoes_racao" ON public.solicitacoes_racao;
CREATE POLICY "Users can view solicitacoes_racao by org" ON public.solicitacoes_racao FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert solicitacoes_racao for org" ON public.solicitacoes_racao FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update solicitacoes_racao for org" ON public.solicitacoes_racao FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete solicitacoes_racao for org" ON public.solicitacoes_racao FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- tabelas_preco
DROP POLICY IF EXISTS "Users can view tabelas_preco" ON public.tabelas_preco;
DROP POLICY IF EXISTS "Users can insert tabelas_preco" ON public.tabelas_preco;
DROP POLICY IF EXISTS "Users can update tabelas_preco" ON public.tabelas_preco;
DROP POLICY IF EXISTS "Users can delete tabelas_preco" ON public.tabelas_preco;
CREATE POLICY "Users can view tabelas_preco by org" ON public.tabelas_preco FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert tabelas_preco for org" ON public.tabelas_preco FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update tabelas_preco for org" ON public.tabelas_preco FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete tabelas_preco for org" ON public.tabelas_preco FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- taxas_bancarias
DROP POLICY IF EXISTS "Users can view taxas_bancarias" ON public.taxas_bancarias;
DROP POLICY IF EXISTS "Users can insert taxas_bancarias" ON public.taxas_bancarias;
DROP POLICY IF EXISTS "Users can update taxas_bancarias" ON public.taxas_bancarias;
DROP POLICY IF EXISTS "Users can delete taxas_bancarias" ON public.taxas_bancarias;
CREATE POLICY "Users can view taxas_bancarias by org" ON public.taxas_bancarias FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert taxas_bancarias for org" ON public.taxas_bancarias FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update taxas_bancarias for org" ON public.taxas_bancarias FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete taxas_bancarias for org" ON public.taxas_bancarias FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- tratamentos_lote
DROP POLICY IF EXISTS "Users can view tratamentos_lote" ON public.tratamentos_lote;
DROP POLICY IF EXISTS "Users can insert tratamentos_lote" ON public.tratamentos_lote;
DROP POLICY IF EXISTS "Users can update tratamentos_lote" ON public.tratamentos_lote;
DROP POLICY IF EXISTS "Users can delete tratamentos_lote" ON public.tratamentos_lote;
CREATE POLICY "Users can view tratamentos_lote by org" ON public.tratamentos_lote FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert tratamentos_lote for org" ON public.tratamentos_lote FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update tratamentos_lote for org" ON public.tratamentos_lote FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete tratamentos_lote for org" ON public.tratamentos_lote FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- user_modulos
DROP POLICY IF EXISTS "Users can view user_modulos" ON public.user_modulos;
DROP POLICY IF EXISTS "Users can insert user_modulos" ON public.user_modulos;
DROP POLICY IF EXISTS "Users can update user_modulos" ON public.user_modulos;
DROP POLICY IF EXISTS "Users can delete user_modulos" ON public.user_modulos;
CREATE POLICY "Users can view user_modulos by org" ON public.user_modulos FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert user_modulos for org" ON public.user_modulos FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can update user_modulos for org" ON public.user_modulos FOR UPDATE TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can delete user_modulos for org" ON public.user_modulos FOR DELETE TO authenticated USING (integrado_id = get_my_integrado_id());

-- producao_logs (usa ordem_producao para validar org)
DROP POLICY IF EXISTS "Users can view producao_logs" ON public.producao_logs;
DROP POLICY IF EXISTS "Users can insert producao_logs" ON public.producao_logs;
CREATE POLICY "Users can view producao_logs by org" ON public.producao_logs FOR SELECT TO authenticated USING (integrado_id = get_my_integrado_id());
CREATE POLICY "Users can insert producao_logs for org" ON public.producao_logs FOR INSERT TO authenticated WITH CHECK (integrado_id = get_my_integrado_id());