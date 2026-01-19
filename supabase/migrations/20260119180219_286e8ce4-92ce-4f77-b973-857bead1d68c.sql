-- Política RLS para fornecedores verem seus próprios registros de parceiros
CREATE POLICY "Fornecedores can view own parceiros records"
ON public.parceiros
FOR SELECT
TO authenticated
USING (
  fornecedor_global_id IS NOT NULL
  AND fornecedor_global_id = (
    SELECT fornecedor_global_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    AND fornecedor_global_id IS NOT NULL
  )
);