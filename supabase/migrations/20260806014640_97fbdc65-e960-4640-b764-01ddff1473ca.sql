ALTER TABLE public.meta_refresh_jobs
  ADD COLUMN IF NOT EXISTS available_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.search_keywords
  ADD COLUMN IF NOT EXISTS last_mined_at timestamp with time zone;

ALTER TABLE public.mining_settings
  ADD COLUMN IF NOT EXISTS keywords_per_run integer NOT NULL DEFAULT 60;

UPDATE public.mining_settings SET keywords_per_run = 60 WHERE keywords_per_run IS NULL;

CREATE OR REPLACE FUNCTION public.claim_refresh_jobs(p_limit integer DEFAULT 3)
 RETURNS SETOF meta_refresh_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
    UPDATE public.meta_refresh_jobs
    SET status = 'running', started_at = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM public.meta_refresh_jobs
      WHERE status = 'pending'
        AND available_at <= now()
      ORDER BY available_at, created_at
      FOR UPDATE SKIP LOCKED
      LIMIT p_limit
    )
    RETURNING *;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mining_requeue_job(
  p_job_id uuid,
  p_available_at timestamp with time zone DEFAULT now()
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.meta_refresh_jobs
  SET status = 'pending',
      started_at = null,
      finished_at = null,
      available_at = p_available_at,
      error = null
  WHERE id = p_job_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mining_ensure_classify_jobs(p_run_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing int;
BEGIN
  SELECT count(*) INTO v_existing
  FROM public.meta_refresh_jobs
  WHERE run_id = p_run_id AND kind = 'classify.upsert';

  IF v_existing > 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.meta_refresh_jobs (run_id, kind, payload)
  SELECT p_run_id, 'classify.upsert', jsonb_build_object('ad_archive_ids', chunk_ids)
  FROM (
    SELECT array_agg(ad_archive_id) AS chunk_ids
    FROM (
      SELECT ad_archive_id, (row_number() OVER (ORDER BY ad_archive_id) - 1) / 150 AS chunk
      FROM public.meta_refresh_ads_raw
      WHERE run_id = p_run_id
    ) r
    GROUP BY chunk
  ) grouped;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mining_partial_finalize(p_run_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.meta_refresh_runs
  SET phase = 'finalize'
  WHERE id = p_run_id
    AND status = 'running'
    AND phase IN ('search', 'snapshot', 'classify');

  UPDATE public.meta_refresh_jobs
  SET status = 'failed',
      finished_at = now(),
      error = 'cancelado por watchdog/finalização parcial'
  WHERE run_id = p_run_id
    AND status = 'pending'
    AND kind = 'meta.search';

  PERFORM public.mining_ensure_classify_jobs(p_run_id);

  INSERT INTO public.meta_refresh_jobs (run_id, kind, payload)
  SELECT p_run_id, 'run.finalize', '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.meta_refresh_jobs
    WHERE run_id = p_run_id AND kind = 'run.finalize'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.mining_requeue_job(uuid, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mining_requeue_job(uuid, timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.mining_ensure_classify_jobs(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mining_ensure_classify_jobs(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mining_partial_finalize(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mining_partial_finalize(uuid) TO service_role;

CREATE INDEX IF NOT EXISTS idx_meta_refresh_jobs_available
  ON public.meta_refresh_jobs (available_at, created_at)
  WHERE status = 'pending';