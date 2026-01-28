-- Criar bucket público para imagens do catálogo
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogo-fornecedor', 'catalogo-fornecedor', true);

-- Política: fornecedor pode fazer upload de suas próprias imagens
CREATE POLICY "Fornecedor pode fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'catalogo-fornecedor' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (
    SELECT fornecedor_global_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política: fornecedor pode atualizar suas próprias imagens
CREATE POLICY "Fornecedor pode atualizar imagens"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'catalogo-fornecedor' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (
    SELECT fornecedor_global_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política: fornecedor pode deletar suas próprias imagens
CREATE POLICY "Fornecedor pode deletar imagens"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'catalogo-fornecedor' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (
    SELECT fornecedor_global_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Política: leitura pública (para vitrine)
CREATE POLICY "Leitura publica catalogo"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalogo-fornecedor');

-- Adicionar coluna de imagem na tabela de produtos
ALTER TABLE public.produtos_catalogo_fornecedor
  ADD COLUMN IF NOT EXISTS imagem_url TEXT;