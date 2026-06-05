-- Remove cron duplicado de auto-temperatura (mantém apenas auto-temperatura-5min).
-- Ref. auditoria Ambiência & Iluminação — achado M4.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-temperatura-every-5min') THEN
    PERFORM cron.unschedule('auto-temperatura-every-5min');
  END IF;
END $$;