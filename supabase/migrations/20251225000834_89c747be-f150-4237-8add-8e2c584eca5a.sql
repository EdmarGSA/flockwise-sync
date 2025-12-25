-- Migration 2: Update RLS policies and create functions

-- 1. Drop existing RLS policies on lotes
DROP POLICY IF EXISTS "Users can view lotes by org" ON public.lotes;
DROP POLICY IF EXISTS "Users can insert lotes for org" ON public.lotes;
DROP POLICY IF EXISTS "Users can update lotes for org" ON public.lotes;

-- 2. Create new RLS policies for lotes with criador logic
CREATE POLICY "Users can view lotes by org"
ON public.lotes FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR criador_id = auth.uid()
  )
);

CREATE POLICY "Users can insert lotes for org"
ON public.lotes FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update lotes for org"
ON public.lotes FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR criador_id = auth.uid()
  )
);

-- 3. Update mortalidade policies for criador
DROP POLICY IF EXISTS "Users can view mortalidade by org" ON public.mortalidade;
DROP POLICY IF EXISTS "Users can insert mortalidade for org" ON public.mortalidade;
DROP POLICY IF EXISTS "Users can update mortalidade for org" ON public.mortalidade;

CREATE POLICY "Users can view mortalidade by org"
ON public.mortalidade FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert mortalidade for org"
ON public.mortalidade FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update mortalidade for org"
ON public.mortalidade FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 4. Update pesagens policies
DROP POLICY IF EXISTS "Users can view pesagens by org" ON public.pesagens;
DROP POLICY IF EXISTS "Users can insert pesagens for org" ON public.pesagens;
DROP POLICY IF EXISTS "Users can update pesagens for org" ON public.pesagens;

CREATE POLICY "Users can view pesagens by org"
ON public.pesagens FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert pesagens for org"
ON public.pesagens FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update pesagens for org"
ON public.pesagens FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 5. Update metas_peso policies
DROP POLICY IF EXISTS "Users can view metas_peso by org" ON public.metas_peso;
DROP POLICY IF EXISTS "Users can insert metas_peso for org" ON public.metas_peso;
DROP POLICY IF EXISTS "Users can update metas_peso for org" ON public.metas_peso;

CREATE POLICY "Users can view metas_peso by org"
ON public.metas_peso FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert metas_peso for org"
ON public.metas_peso FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update metas_peso for org"
ON public.metas_peso FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 6. Update metas_postura policies
DROP POLICY IF EXISTS "Users can view metas_postura by org" ON public.metas_postura;
DROP POLICY IF EXISTS "Users can insert metas_postura for org" ON public.metas_postura;
DROP POLICY IF EXISTS "Users can update metas_postura for org" ON public.metas_postura;

CREATE POLICY "Users can view metas_postura by org"
ON public.metas_postura FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert metas_postura for org"
ON public.metas_postura FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update metas_postura for org"
ON public.metas_postura FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 7. Update recebimento_lotes policies
DROP POLICY IF EXISTS "Users can view recebimento_lotes by org" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can insert recebimento_lotes for org" ON public.recebimento_lotes;
DROP POLICY IF EXISTS "Users can update recebimento_lotes for org" ON public.recebimento_lotes;

CREATE POLICY "Users can view recebimento_lotes by org"
ON public.recebimento_lotes FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert recebimento_lotes for org"
ON public.recebimento_lotes FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update recebimento_lotes for org"
ON public.recebimento_lotes FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 8. Update solicitacoes_racao policies
DROP POLICY IF EXISTS "Users can view solicitacoes_racao by org" ON public.solicitacoes_racao;
DROP POLICY IF EXISTS "Users can insert solicitacoes_racao for org" ON public.solicitacoes_racao;
DROP POLICY IF EXISTS "Users can update solicitacoes_racao for org" ON public.solicitacoes_racao;

CREATE POLICY "Users can view solicitacoes_racao by org"
ON public.solicitacoes_racao FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert solicitacoes_racao for org"
ON public.solicitacoes_racao FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update solicitacoes_racao for org"
ON public.solicitacoes_racao FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 9. Update producao_ovos policies
DROP POLICY IF EXISTS "Users can view producao_ovos by org" ON public.producao_ovos;
DROP POLICY IF EXISTS "Users can insert producao_ovos for org" ON public.producao_ovos;
DROP POLICY IF EXISTS "Users can update producao_ovos for org" ON public.producao_ovos;

CREATE POLICY "Users can view producao_ovos by org"
ON public.producao_ovos FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert producao_ovos for org"
ON public.producao_ovos FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update producao_ovos for org"
ON public.producao_ovos FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 10. Update observacoes_lote policies
DROP POLICY IF EXISTS "Users can view observacoes_lote by org" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can insert observacoes_lote for org" ON public.observacoes_lote;
DROP POLICY IF EXISTS "Users can update observacoes_lote for org" ON public.observacoes_lote;

CREATE POLICY "Users can view observacoes_lote by org"
ON public.observacoes_lote FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert observacoes_lote for org"
ON public.observacoes_lote FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update observacoes_lote for org"
ON public.observacoes_lote FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 11. Update tratamentos_lote policies
DROP POLICY IF EXISTS "Users can view tratamentos_lote by org" ON public.tratamentos_lote;
DROP POLICY IF EXISTS "Users can insert tratamentos_lote for org" ON public.tratamentos_lote;
DROP POLICY IF EXISTS "Users can update tratamentos_lote for org" ON public.tratamentos_lote;

CREATE POLICY "Users can view tratamentos_lote by org"
ON public.tratamentos_lote FOR SELECT TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

CREATE POLICY "Users can insert tratamentos_lote for org"
ON public.tratamentos_lote FOR INSERT TO authenticated
WITH CHECK (integrado_id = get_my_integrado_id());

CREATE POLICY "Users can update tratamentos_lote for org"
ON public.tratamentos_lote FOR UPDATE TO authenticated
USING (
  integrado_id = get_my_integrado_id()
  AND (
    NOT has_role(auth.uid(), 'criador')
    OR lote_id IN (SELECT id FROM public.lotes WHERE criador_id = auth.uid())
  )
);

-- 12. Create function to get criadores
CREATE OR REPLACE FUNCTION public.get_criadores()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'criador'
    AND p.integrado_id = get_my_integrado_id()
$$;