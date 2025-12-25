-- Drop existing policies on lotes
DROP POLICY IF EXISTS "Users can view lotes by org" ON public.lotes;
DROP POLICY IF EXISTS "Users can update lotes for org" ON public.lotes;

-- Create new SELECT policy with veterinario filter
CREATE POLICY "Users can view lotes by org" 
ON public.lotes 
FOR SELECT 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    -- Se NÃO for criador NEM veterinário, pode ver tudo
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    -- Se for criador, só vê seus lotes
    OR (has_role(auth.uid(), 'criador') AND criador_id = auth.uid())
    -- Se for veterinário, só vê seus lotes
    OR (has_role(auth.uid(), 'veterinario') AND veterinario_id = auth.uid())
  )
);

-- Create new UPDATE policy with veterinario filter
CREATE POLICY "Users can update lotes for org" 
ON public.lotes 
FOR UPDATE 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND criador_id = auth.uid())
    OR (has_role(auth.uid(), 'veterinario') AND veterinario_id = auth.uid())
  )
);

-- Update observacoes_lote policies
DROP POLICY IF EXISTS "Users can view observacoes_lote by org" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can update observacoes_lote for org" ON public.observacoes_lote;

CREATE POLICY "Users can view observacoes_lote by org" 
ON public.observacoes_lote 
FOR SELECT 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);

CREATE POLICY "Users can update observacoes_lote for org" 
ON public.observacoes_lote 
FOR UPDATE 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);

-- Update metas_peso policies
DROP POLICY IF EXISTS "Users can view metas_peso by org" ON public.metas_peso;
DROP POLICY IF EXISTS "Users can update metas_peso for org" ON public.metas_peso;

CREATE POLICY "Users can view metas_peso by org" 
ON public.metas_peso 
FOR SELECT 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);

CREATE POLICY "Users can update metas_peso for org" 
ON public.metas_peso 
FOR UPDATE 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);

-- Update recebimento_lotes policies
DROP POLICY IF EXISTS "Users can view recebimento_lotes by org" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can update recebimento_lotes for org" ON public.recebimento_lotes;

CREATE POLICY "Users can view recebimento_lotes by org" 
ON public.recebimento_lotes 
FOR SELECT 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);

CREATE POLICY "Users can update recebimento_lotes for org" 
ON public.recebimento_lotes 
FOR UPDATE 
USING (
  integrado_id = get_my_integrado_id() 
  AND (
    (NOT has_role(auth.uid(), 'criador') AND NOT has_role(auth.uid(), 'veterinario'))
    OR (has_role(auth.uid(), 'criador') AND lote_id IN (SELECT id FROM lotes WHERE criador_id = auth.uid()))
    OR (has_role(auth.uid(), 'veterinario') AND lote_id IN (SELECT id FROM lotes WHERE veterinario_id = auth.uid()))
  )
);