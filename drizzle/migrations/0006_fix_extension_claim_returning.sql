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
  ), upd AS (
    UPDATE public.extension_candidates c SET status = 'processing', claim_token = v_token, claimed_at = now()
    FROM picked WHERE c.id = picked.id
    RETURNING c.id
  )
  SELECT array_agg(upd.id) INTO v_ids FROM upd;
  RETURN QUERY SELECT v_token, v_rec, COALESCE(v_ids, '{}'::uuid[]);
END $function$;
REVOKE EXECUTE ON FUNCTION public.extension_claim_candidates(int,int,int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extension_claim_candidates(int,int,int) TO service_role;