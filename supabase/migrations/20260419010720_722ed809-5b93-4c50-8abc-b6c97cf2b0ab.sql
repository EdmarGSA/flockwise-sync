
-- ============================================================
-- FASE 1 — SEGURANÇA CRÍTICA
-- ============================================================

-- 1. ORGANIZACOES — remover acesso anônimo
DROP POLICY IF EXISTS "Anon can read organizacoes for traceability" ON public.organizacoes;

-- 2. NUCLEOS — remover acesso anônimo
DROP POLICY IF EXISTS "Anon can read nucleos for traceability" ON public.nucleos;

-- 3. LOTES — remover acesso anônimo
DROP POLICY IF EXISTS "Anon can read lotes for traceability" ON public.lotes;

-- 4. GALPOES — remover acesso anônimo
DROP POLICY IF EXISTS "Anon can read galpoes for traceability" ON public.galpoes;

-- 5. ESTOQUE_OVOS — remover acesso anônimo
DROP POLICY IF EXISTS "Anon can read estoque_ovos for traceability" ON public.estoque_ovos;

-- 6. PROFILES — remover policy duplicada permissiva
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- 7. SERVICE_ROLE redundante — service role já bypassa RLS
DROP POLICY IF EXISTS "Service role full access" ON public.nfe_racao_recebidas;
DROP POLICY IF EXISTS "Service role full access" ON public.timers_seguranca_iot;

-- 8. Função update_updated_at_column — search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================================
-- STORAGE — endurecer policies dos buckets sensíveis
-- ============================================================

-- mortalidade-fotos: tornar bucket privado (continua existindo, mas sem listagem pública)
UPDATE storage.buckets SET public = false WHERE id = 'mortalidade-fotos';
UPDATE storage.buckets SET public = false WHERE id = 'veterinario-midias';

-- Drop policies antigas permissivas
DROP POLICY IF EXISTS "Anyone can view mortalidade photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view veterinario midias" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload mortalidade photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload veterinario midias" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their veterinario midias" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their veterinario midias" ON storage.objects;

-- Novas policies: exigem path {integrado_id}/...
-- mortalidade-fotos
CREATE POLICY "Org users can view mortalidade photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mortalidade-fotos'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can upload mortalidade photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mortalidade-fotos'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can update mortalidade photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'mortalidade-fotos'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can delete mortalidade photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mortalidade-fotos'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

-- veterinario-midias
CREATE POLICY "Org users can view veterinario midias"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'veterinario-midias'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can upload veterinario midias"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'veterinario-midias'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can update veterinario midias"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'veterinario-midias'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);

CREATE POLICY "Org users can delete veterinario midias"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'veterinario-midias'
  AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text
);
