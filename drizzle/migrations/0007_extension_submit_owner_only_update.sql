CREATE OR REPLACE FUNCTION public.extension_submit_candidates(p_user_id uuid, p_rows jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r jsonb; v_ins int := 0; v_upd int := 0; v_skip int := 0; v_status text; v_owner uuid;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_status := NULL; v_owner := NULL;
    SELECT status, submitted_by INTO v_status, v_owner FROM public.extension_candidates WHERE ad_archive_id = r->>'ad_archive_id';
    IF v_status IS NULL THEN
      INSERT INTO public.extension_candidates(ad_archive_id, keyword_used, page_id, page_name, creative_text, media_url, link_url, active_days, repeated_ads_count, submitted_by)
      VALUES (r->>'ad_archive_id', r->>'keyword_used', r->>'page_id', r->>'page_name', r->>'creative_text', r->>'media_url', r->>'link_url',
              NULLIF(r->>'active_days','')::int, NULLIF(r->>'repeated_ads_count','')::int, p_user_id)
      ON CONFLICT (ad_archive_id) DO NOTHING;
      IF FOUND THEN v_ins := v_ins + 1; ELSE v_skip := v_skip + 1; END IF;
    ELSIF v_status IN ('pending','failed') AND v_owner = p_user_id THEN
      -- Only the original submitter can refresh data; a failed row gets a fresh retry budget.
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
      WHERE ad_archive_id = r->>'ad_archive_id' AND status IN ('pending','failed') AND submitted_by = p_user_id;
      v_upd := v_upd + 1;
    ELSE
      v_skip := v_skip + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip);
END $function$;
REVOKE EXECUTE ON FUNCTION public.extension_submit_candidates(uuid,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extension_submit_candidates(uuid,jsonb) TO service_role;