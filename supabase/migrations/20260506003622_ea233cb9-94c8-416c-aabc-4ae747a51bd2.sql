
DO $$
DECLARE
  v_url text := 'https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/auto-ventilacao';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGp4dGxmaHhqdGVuaGh6YWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5ODIxNDAsImV4cCI6MjA4MDU1ODE0MH0.mrGlziI-2FsD8Nq6iR1PBBln5C2W4AypPJ7I2R27HdA';
BEGIN
  PERFORM cron.unschedule('auto-ventilacao-3min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-ventilacao-3min');
  PERFORM cron.schedule(
    'auto-ventilacao-3min',
    '*/3 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cmd$, v_url, v_anon)
  );
END $$;
