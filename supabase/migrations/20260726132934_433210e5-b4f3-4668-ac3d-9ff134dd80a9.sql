DO $$
DECLARE v_id bigint;
BEGIN
  SELECT jobid INTO v_id FROM cron.job WHERE jobname = 'auto-iluminacao-1min';
  IF v_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_id, schedule => '*/5 * * * *');
  END IF;
END $$;