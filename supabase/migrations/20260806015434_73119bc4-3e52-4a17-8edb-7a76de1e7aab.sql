CREATE POLICY "Admins can read refresh jobs" ON public.meta_refresh_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.mining_run_progress(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_run public.meta_refresh_runs%ROWTYPE;
  v_jobs jsonb;
  v_ads_found bigint;
  v_upserts bigint;
  v_blacklist bigint;
  v_language bigint;
  v_category bigint;
  v_duplicate bigint;
  v_nolanding bigint;
  v_lowrel bigint;
BEGIN
  IF NOT public.mining_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_run FROM public.meta_refresh_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_object_agg(t.kind, t.counts) INTO v_jobs
  FROM (
    SELECT j.kind,
      jsonb_build_object(
        'total', count(*),
        'done', count(*) FILTER (WHERE j.status = 'done'),
        'failed', count(*) FILTER (WHERE j.status = 'failed'),
        'pending', count(*) FILTER (WHERE j.status IN ('pending','running'))
      ) AS counts
    FROM public.meta_refresh_jobs j
    WHERE j.run_id = p_run_id
    GROUP BY j.kind
  ) t;

  SELECT
    COALESCE(SUM((l.details->>'ads_found')::bigint), 0),
    COALESCE(SUM((l.details->>'upserts')::bigint), 0),
    COALESCE(SUM((l.details->>'blacklist')::bigint), 0),
    COALESCE(SUM((l.details->>'language')::bigint), 0),
    COALESCE(SUM((l.details->>'category')::bigint), 0),
    COALESCE(SUM((l.details->>'duplicate')::bigint), 0),
    COALESCE(SUM((l.details->>'noLanding')::bigint), 0),
    COALESCE(SUM((l.details->>'lowRelevance')::bigint), 0)
  INTO v_ads_found, v_upserts, v_blacklist, v_language, v_category, v_duplicate, v_nolanding, v_lowrel
  FROM public.mining_logs l
  WHERE l.kind = 'job' AND (l.details->>'run_id') = p_run_id::text;

  RETURN jsonb_build_object(
    'run_id', v_run.id,
    'status', v_run.status,
    'phase', v_run.phase,
    'started_at', v_run.started_at,
    'finished_at', v_run.finished_at,
    'details', v_run.details,
    'jobs', COALESCE(v_jobs, '{}'::jsonb),
    'ads_found', v_ads_found,
    'upserts', v_upserts,
    'discarded', jsonb_build_object(
      'blacklist', v_blacklist,
      'language', v_language,
      'category', v_category,
      'duplicate', v_duplicate,
      'no_text', v_nolanding,
      'low_relevance', v_lowrel
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mining_run_progress(uuid) TO authenticated;