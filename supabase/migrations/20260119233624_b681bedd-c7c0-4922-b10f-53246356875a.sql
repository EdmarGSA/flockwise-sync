-- Política para produto_fornecedor: Fornecedores podem ver registros vinculados
CREATE POLICY "Fornecedores can view linked produto_fornecedor"
ON public.produto_fornecedor
FOR SELECT
TO authenticated
USING (
  parceiro_id IN (
    SELECT id FROM public.parceiros
    WHERE fornecedor_global_id = (
      SELECT fornecedor_global_id FROM public.profiles
      WHERE id = auth.uid() AND fornecedor_global_id IS NOT NULL
    )
  )
);

-- Política para produtos: Fornecedores podem ver produtos vinculados
CREATE POLICY "Fornecedores can view linked produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT produto_id FROM public.produto_fornecedor
    WHERE parceiro_id IN (
      SELECT id FROM public.parceiros
      WHERE fornecedor_global_id = (
        SELECT fornecedor_global_id FROM public.profiles
        WHERE id = auth.uid() AND fornecedor_global_id IS NOT NULL
      )
    )
  )
);

-- Atualizar profiles de fornecedores para role correto e limpar integrado_id
UPDATE public.profiles
SET integrado_id = NULL
WHERE fornecedor_global_id IS NOT NULL AND integrado_id IS NOT NULL;