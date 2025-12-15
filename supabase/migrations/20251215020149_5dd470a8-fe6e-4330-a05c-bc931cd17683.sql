-- Permitir produto_id ser nullable
ALTER TABLE public.tabelas_preco_itens 
  ALTER COLUMN produto_id DROP NOT NULL;

-- Adicionar referência para produtos_animais
ALTER TABLE public.tabelas_preco_itens 
  ADD COLUMN produto_animal_id UUID REFERENCES public.produtos_animais(id);

-- Constraint: deve ter produto_id OU produto_animal_id (não ambos, não nenhum)
ALTER TABLE public.tabelas_preco_itens 
  ADD CONSTRAINT check_produto_ou_produto_animal 
  CHECK (
    (produto_id IS NOT NULL AND produto_animal_id IS NULL) OR
    (produto_id IS NULL AND produto_animal_id IS NOT NULL)
  );