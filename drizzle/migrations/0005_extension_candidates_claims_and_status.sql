ALTER TABLE public.extension_candidates
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS media_error text,
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.extension_candidates DROP CONSTRAINT IF EXISTS extension_candidates_status_check;
ALTER TABLE public.extension_candidates ADD CONSTRAINT extension_candidates_status_check
  CHECK (status IN ('pending','processing','processed','rejected','failed'));

-- One live row per ad across every state (dedup survives claims and failures).
CREATE UNIQUE INDEX IF NOT EXISTS extension_candidates_ad_uniq ON public.extension_candidates (ad_archive_id);
DROP INDEX IF EXISTS public.extension_candidates_live_uniq;
CREATE INDEX IF NOT EXISTS extension_candidates_user_idx ON public.extension_candidates (submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS extension_candidates_claim_idx ON public.extension_candidates (claim_token) WHERE claim_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.extension_submit_candidates(p_user_id uuid, p_rows jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb; v_ins int := 0; v_upd int := 0; v_skip int := 0; v_status text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_status := NULL;
    SELECT status INTO v_status FROM public.extension_candidates WHERE ad_archive_id = r->>'ad_archive_id';
    IF v_status IS NULL THEN
      INSERT INTO public.extension_candidates(ad_archive_id, keyword_used, page_id, page_name, creative_text, media_url, link_url, active_days, repeated_ads_count, submitted_by)
      VALUES (r->>'ad_archive_id', r->>'keyword_used', r->>'page_id', r->>'page_name', r->>'creative_text', r->>'media_url', r->>'link_url',
              NULLIF(r->>'active_days','')::int, NULLIF(r->>'repeated_ads_count','')::int, p_user_id)
      ON CONFLICT (ad_archive_id) DO NOTHING;
      IF FOUND THEN v_ins := v_ins + 1; ELSE v_skip := v_skip + 1; END IF;
    ELSIF v_status IN ('pending','failed') THEN
      -- Pending gets fresher data; a permanently failed row gets a fresh retry budget.
      UPDATE public.extension_candidates SET
        keyword_used = COALESCE(r->>'keyword_used', keyword_used),
        page_id = COALESCE(r->>'page_id', page_id),
        page_name = COALESCE(r->>'page_name', page_name),
        creative_text = COALESCE(r->>'creative_text', creative_text),
        media_url = COALESCE(r->>'media_url', media_url),
        link_url = COALESCE(r->>'link_url', link_url),
        active_days = COALESCE(NULLIF(r->>'active_days','')::int, active_days),
        repeated_ads_count = COALESCE(NULLIF(r->>'repeated_ads_count','')::int, repeated_ads_count),
        submitted_at = now(),
        status = 'pending',
        attempts = CASE WHEN status = 'failed' THEN 0 ELSE attempts END,
        last_error = CASE WHEN status = 'failed' THEN NULL ELSE last_error END
      WHERE ad_archive_id = r->>'ad_archive_id' AND status IN ('pending','failed');
      v_upd := v_upd + 1;
    ELSE
      v_skip := v_skip + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip);
END $function$;

-- Atomic claim. Stale claims (crashed processing) go back to pending, or to failed after p_max_attempts.
CREATE OR REPLACE FUNCTION public.extension_claim_candidates(p_limit int, p_stale_minutes int DEFAULT 15, p_max_attempts int DEFAULT 3)
 RETURNS TABLE(claim_token uuid, recovered int, ids uuid[])
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_token uuid := gen_random_uuid(); v_rec int; v_ids uuid[];
BEGIN
  UPDATE public.extension_candidates c SET
    status = CASE WHEN c.attempts + 1 >= p_max_attempts THEN 'failed' ELSE 'pending' END,
    attempts = c.attempts + 1,
    last_error = 'reserva abandonada (processamento interrompido)',
    claim_token = NULL, claimed_at = NULL
  WHERE c.status = 'processing' AND c.claimed_at < now() - make_interval(mins => p_stale_minutes);
  GET DIAGNOSTICS v_rec = ROW_COUNT;

  WITH picked AS (
    SELECT c.id FROM public.extension_candidates c
    WHERE c.status = 'pending'
    ORDER BY c.submitted_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.extension_candidates c SET status = 'processing', claim_token = v_token, claimed_at = now()
  FROM picked WHERE c.id = picked.id
  RETURNING c.id INTO v_ids;
  SELECT array_agg(id) INTO v_ids FROM public.extension_candidates WHERE extension_candidates.claim_token = v_token;
  RETURN QUERY SELECT v_token, v_rec, COALESCE(v_ids, '{}'::uuid[]);
END $function$;

CREATE OR REPLACE FUNCTION public.extension_complete_claim(p_claim_token uuid, p_run_id uuid)
 RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  UPDATE public.extension_candidates SET status = 'processed', run_id = p_run_id, processed_at = now(),
    attempts = attempts + 1, last_error = NULL, claim_token = NULL, claimed_at = NULL
  WHERE claim_token = p_claim_token AND status = 'processing';
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.extension_release_claim(p_claim_token uuid, p_error text, p_max_attempts int DEFAULT 3)
 RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  UPDATE public.extension_candidates SET
    status = CASE WHEN attempts + 1 >= p_max_attempts THEN 'failed' ELSE 'pending' END,
    attempts = attempts + 1, last_error = left(p_error, 500), claim_token = NULL, claimed_at = NULL
  WHERE claim_token = p_claim_token AND status = 'processing';
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $function$;

-- Status for the submitting user only. Result of processed ads is derived read-only from the catalog.
CREATE OR REPLACE FUNCTION public.extension_candidate_status(p_user_id uuid, p_ids text[] DEFAULT NULL, p_limit int DEFAULT 50)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'submitted_at' DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
      'ad_archive_id', c.ad_archive_id,
      'status', c.status,
      'submitted_at', c.submitted_at,
      'processed_at', c.processed_at,
      'attempts', c.attempts,
      'retryable', c.status = 'failed' OR (c.status = 'pending' AND c.attempts > 0),
      'error', CASE WHEN c.status IN ('failed','pending') THEN c.last_error END,
      'reject_reason', c.reject_reason,
      'result', CASE
        WHEN c.status <> 'processed' THEN NULL
        WHEN o.id IS NULL AND m.id IS NULL THEN 'classifying'
        WHEN o.id IS NULL THEN 'not_grouped'
        WHEN o.commercial_quality = 'entertainment' OR (o.qualified = false AND o.reject_reason IS NOT NULL) THEN 'not_qualified'
        WHEN o.visible THEN 'published'
        WHEN o.qualified THEN 'qualified'
        ELSE 'monitoring' END
    ) AS x
    FROM public.extension_candidates c
    LEFT JOIN public.meta_offers m ON m.ad_archive_id = c.ad_archive_id
    LEFT JOIN public.offers o ON o.id = m.offer_id
    WHERE c.submitted_by = p_user_id
      AND (p_ids IS NULL OR c.ad_archive_id = ANY(p_ids))
    ORDER BY c.submitted_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) s;
$function$;

REVOKE EXECUTE ON FUNCTION public.extension_claim_candidates(int,int,int) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extension_complete_claim(uuid,uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extension_release_claim(uuid,text,int) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extension_candidate_status(uuid,text[],int) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.extension_submit_candidates(uuid,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extension_claim_candidates(int,int,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.extension_complete_claim(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.extension_release_claim(uuid,text,int) TO service_role;
GRANT EXECUTE ON FUNCTION public.extension_candidate_status(uuid,text[],int) TO service_role;
GRANT EXECUTE ON FUNCTION public.extension_submit_candidates(uuid,jsonb) TO service_role;