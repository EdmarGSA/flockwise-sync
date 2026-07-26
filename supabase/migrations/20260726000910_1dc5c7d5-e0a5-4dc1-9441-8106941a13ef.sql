CREATE POLICY "ripi_pdfs_select_own_org" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ripi-pdfs' AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text);

CREATE POLICY "ripi_pdfs_insert_own_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ripi-pdfs' AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text);

CREATE POLICY "ripi_pdfs_delete_own_org" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ripi-pdfs' AND (storage.foldername(name))[1] = public.get_my_integrado_id()::text);