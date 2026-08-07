CREATE OR REPLACE FUNCTION public.mining_run_breakdown(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_categories jsonb;
  v_keywords jsonb;
  v_planned jsonb;
  v_pages int;
  v_ads int;
  v_jobs jsonb;
BEGIN
  IF NOT public.mining_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', COALESCE(c.category, 'Sem categoria'), 'ads', c.cnt) ORDER BY c.cnt DESC), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT category, count(*)::int AS cnt
    FROM public.meta_refresh_ads_raw
    WHERE run_id = p_run_id
    GROUP BY category
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('term', k.term, 'ads', k.cnt) ORDER BY k.cnt DESC), '[]'::jsonb)
  INTO v_keywords
  FROM (
    SELECT term, count(*)::int AS cnt
    FROM public.meta_refresh_ads_raw
    WHERE run_id = p_run_id AND term IS NOT NULL
    GROUP BY term
  ) k;

  SELECT COALESCE(jsonb_agg(DISTINCT s.value->>'term'), '[]'::jsonb)
  INTO v_planned
  FROM public.meta_refresh_jobs j
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(j.payload->'steps', '[]'::jsonb)) AS s(value)
  WHERE j.run_id = p_run_id AND j.kind = 'meta.search';

  SELECT count(DISTINCT page_id)::int, count(*)::int
  INTO v_pages, v_ads
  FROM public.meta_refresh_ads_raw
  WHERE run_id = p_run_id;

  SELECT jsonb_build_object(
    'total', count(*),
    'done', count(*) FILTER (WHERE status = 'done'),
    'failed', count(*) FILTER (WHERE status = 'failed'),
    'running', count(*) FILTER (WHERE status = 'running'),
    'pending', count(*) FILTER (WHERE status = 'pending'),
    'last_finished_at', max(finished_at)
  )
  INTO v_jobs
  FROM public.meta_refresh_jobs
  WHERE run_id = p_run_id;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'categories', v_categories,
    'keywords', v_keywords,
    'planned_terms', v_planned,
    'pages_found', COALESCE(v_pages, 0),
    'ads_raw', COALESCE(v_ads, 0),
    'jobs', COALESCE(v_jobs, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mining_cancel_run(p_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.mining_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.meta_refresh_jobs
  SET status = 'failed', finished_at = now(), error = 'cancelado pelo administrador'
  WHERE run_id = p_run_id AND status IN ('pending', 'running');

  UPDATE public.meta_refresh_runs
  SET status = 'canceled', phase = 'done', finished_at = now(),
      error = COALESCE(error, 'cancelado pelo administrador')
  WHERE id = p_run_id AND status = 'running';

  PERFORM public.mining_log('run', 'canceled', 'run cancelada pelo administrador',
    jsonb_build_object('run_id', p_run_id));
END;
$$;

REVOKE ALL ON FUNCTION public.mining_run_breakdown(uuid) FROM public;
REVOKE ALL ON FUNCTION public.mining_cancel_run(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mining_run_breakdown(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mining_cancel_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mining_run_breakdown(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_cancel_run(uuid) TO service_role;