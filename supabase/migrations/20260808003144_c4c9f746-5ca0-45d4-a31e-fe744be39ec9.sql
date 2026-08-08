-- 1) mining_run_progress precisa executar mining_is_admin (não concedida a authenticated).
--    Torna a função SECURITY DEFINER mantendo a barreira 'forbidden' interna.
CREATE OR REPLACE FUNCTION public.mining_run_progress(p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
  v_summary jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.mining_is_admin(auth.uid()) THEN
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

  v_summary := COALESCE(v_run.details->'summary', '{}'::jsonb);

  IF v_ads_found = 0 THEN
    v_ads_found := COALESCE((v_summary->>'ads_found')::bigint, 0);
  END IF;
  IF v_upserts = 0 THEN
    v_upserts := COALESCE(v_run.offers_upserted, 0);
  END IF;

  RETURN jsonb_build_object(
    'run_id', v_run.id,
    'status', v_run.status,
    'phase', v_run.phase,
    'started_at', v_run.started_at,
    'finished_at', v_run.finished_at,
    'details', v_run.details,
    'pages_seen', COALESCE(v_run.pages_seen, 0),
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

REVOKE EXECUTE ON FUNCTION public.mining_run_progress(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mining_run_progress(uuid) TO authenticated, service_role;

-- 2) mining_run_breakdown: usa o resumo congelado quando o raw já foi limpo.
CREATE OR REPLACE FUNCTION public.mining_run_breakdown(p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_categories jsonb;
  v_keywords jsonb;
  v_planned jsonb;
  v_pages int;
  v_ads int;
  v_jobs jsonb;
  v_stored jsonb;
  v_run public.meta_refresh_runs%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.mining_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_run FROM public.meta_refresh_runs WHERE id = p_run_id;
  v_stored := COALESCE(v_run.details->'summary', '{}'::jsonb);

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

  -- Fallbacks: o raw é apagado ao final da run; usa o snapshot / colunas da run.
  IF jsonb_array_length(v_categories) = 0 THEN
    v_categories := COALESCE(v_stored->'categories', '[]'::jsonb);
  END IF;
  IF jsonb_array_length(v_keywords) = 0 THEN
    v_keywords := COALESCE(v_stored->'keywords', '[]'::jsonb);
  END IF;
  IF jsonb_array_length(v_planned) = 0 THEN
    v_planned := COALESCE(v_stored->'planned_terms', '[]'::jsonb);
  END IF;
  IF COALESCE(v_pages, 0) = 0 THEN
    v_pages := COALESCE((v_stored->>'pages_found')::int, COALESCE(v_run.pages_seen, 0));
  END IF;
  IF COALESCE(v_ads, 0) = 0 THEN
    v_ads := COALESCE((v_stored->>'ads_raw')::int, 0);
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.mining_run_breakdown(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mining_run_breakdown(uuid) TO authenticated, service_role;

-- 3) Congela o resumo da run antes de apagar o raw (mesma assinatura, mesmo chamador).
CREATE OR REPLACE FUNCTION public.mining_cleanup_run(p_run_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_categories jsonb;
  v_keywords jsonb;
  v_planned jsonb;
  v_pages int;
  v_ads int;
  v_ads_found bigint;
  v_summary jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', COALESCE(c.category, 'Sem categoria'), 'ads', c.cnt) ORDER BY c.cnt DESC), '[]'::jsonb)
  INTO v_categories
  FROM (
    SELECT category, count(*)::int AS cnt
    FROM public.meta_refresh_ads_raw WHERE run_id = p_run_id GROUP BY category
  ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('term', k.term, 'ads', k.cnt) ORDER BY k.cnt DESC), '[]'::jsonb)
  INTO v_keywords
  FROM (
    SELECT term, count(*)::int AS cnt
    FROM public.meta_refresh_ads_raw WHERE run_id = p_run_id AND term IS NOT NULL GROUP BY term
  ) k;

  SELECT COALESCE(jsonb_agg(DISTINCT s.value->>'term'), '[]'::jsonb)
  INTO v_planned
  FROM public.meta_refresh_jobs j
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(j.payload->'steps', '[]'::jsonb)) AS s(value)
  WHERE j.run_id = p_run_id AND j.kind = 'meta.search';

  SELECT count(DISTINCT page_id)::int, count(*)::int
  INTO v_pages, v_ads
  FROM public.meta_refresh_ads_raw WHERE run_id = p_run_id;

  SELECT COALESCE(SUM((l.details->>'ads_found')::bigint), 0)
  INTO v_ads_found
  FROM public.mining_logs l
  WHERE l.kind = 'job' AND (l.details->>'run_id') = p_run_id::text;

  v_summary := jsonb_build_object(
    'ads_found', COALESCE(v_ads_found, 0),
    'pages_found', COALESCE(v_pages, 0),
    'ads_raw', COALESCE(v_ads, 0),
    'categories', v_categories,
    'keywords', v_keywords,
    'planned_terms', v_planned,
    'frozen_at', now()
  );

  UPDATE public.meta_refresh_runs
  SET details = jsonb_set(COALESCE(details, '{}'::jsonb), '{summary}', v_summary, true)
  WHERE id = p_run_id;

  DELETE FROM public.meta_refresh_ads_raw WHERE run_id = p_run_id;
  DELETE FROM public.meta_refresh_snapshots WHERE run_id = p_run_id;
END;
$function$;