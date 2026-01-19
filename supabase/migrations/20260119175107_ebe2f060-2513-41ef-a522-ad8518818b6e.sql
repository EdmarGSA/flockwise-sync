-- Política RLS para fornecedores verem ordens de compra (usando parceiro_id)
CREATE POLICY "Fornecedores can view own ordens_compra"
ON public.ordens_compra
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parceiros p
    WHERE p.id = ordens_compra.parceiro_id
    AND p.fornecedor_global_id = (
      SELECT fornecedor_global_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      AND fornecedor_global_id IS NOT NULL
    )
  )
);

-- Política RLS para fornecedores atualizarem ordens de compra (confirmar/enviar)
CREATE POLICY "Fornecedores can update own ordens_compra"
ON public.ordens_compra
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parceiros p
    WHERE p.id = ordens_compra.parceiro_id
    AND p.fornecedor_global_id = (
      SELECT fornecedor_global_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      AND fornecedor_global_id IS NOT NULL
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parceiros p
    WHERE p.id = ordens_compra.parceiro_id
    AND p.fornecedor_global_id = (
      SELECT fornecedor_global_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      AND fornecedor_global_id IS NOT NULL
    )
  )
);

-- Política RLS para fornecedores verem itens de ordens de compra
CREATE POLICY "Fornecedores can view own ordens_compra_itens"
ON public.ordens_compra_itens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ordens_compra oc
    JOIN public.parceiros p ON p.id = oc.parceiro_id
    WHERE oc.id = ordens_compra_itens.ordem_compra_id
    AND p.fornecedor_global_id = (
      SELECT fornecedor_global_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      AND fornecedor_global_id IS NOT NULL
    )
  )
);

-- Política RLS para fornecedores verem histórico de preços
CREATE POLICY "Fornecedores can view own historico_precos"
ON public.historico_precos_fornecedor
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.produto_fornecedor pf
    JOIN public.parceiros p ON p.id = pf.parceiro_id
    WHERE pf.id = historico_precos_fornecedor.produto_fornecedor_id
    AND p.fornecedor_global_id = (
      SELECT fornecedor_global_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      AND fornecedor_global_id IS NOT NULL
    )
  )
);