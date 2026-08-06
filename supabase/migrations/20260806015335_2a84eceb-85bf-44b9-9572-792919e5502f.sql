CREATE OR REPLACE FUNCTION public.mining_timeout_run(p_age_minutes integer DEFAULT 50)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.meta_refresh_runs
    WHERE status = 'running'
      AND started_at < now() - (p_age_minutes || ' minutes')::interval
  LOOP
    UPDATE public.meta_refresh_jobs
    SET status = 'failed', finished_at = now(), error = 'hard timeout'
    WHERE run_id = r.id AND status IN ('pending','running');

    PERFORM public.mining_partial_finalize(r.id);
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mining_timeout_run(integer) TO service_role;

ALTER TABLE public.mining_settings
  ALTER COLUMN keywords_per_run SET DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meta_api_delay_ms integer NOT NULL DEFAULT 2000;

UPDATE public.mining_settings
SET keywords_per_run = 30,
    meta_api_delay_ms = 2000
WHERE singleton = true;

SELECT cron.unschedule('modelads-refresh-watchdog');
SELECT cron.schedule(
  'modelads-refresh-watchdog',
  '*/5 * * * *',
  $$
    SELECT public.mining_timeout_run(50);
  $$
);