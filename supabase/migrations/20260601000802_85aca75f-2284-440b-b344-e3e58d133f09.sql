DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'log_decisao_clima',
    'override_iluminacao_canal',
    'override_iluminacao_brain',
    'cortina_estado_atual',
    'estagio_ventilacao_estado',
    'programa_nebulizacao_galpao'
  ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;