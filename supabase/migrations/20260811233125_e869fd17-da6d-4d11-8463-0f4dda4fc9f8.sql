CREATE OR REPLACE FUNCTION public.mining_upsert_offers(p_rows jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  INSERT INTO public.meta_offers (
    ad_archive_id, page_id, page_name, category, language, country, headline,
    description, creative_url, creative_type, ad_snapshot_url, page_url, link_url,
    ad_start_date, is_active, active_days, active_ads_count, status, structure,
    product_type, search_term, quality_score, last_seen
  )
  SELECT
    r->>'ad_archive_id', r->>'page_id', r->>'page_name', r->>'category', r->>'language',
    COALESCE(r->>'country','BR'), r->>'headline', r->>'description', r->>'creative_url',
    r->>'creative_type', r->>'ad_snapshot_url', r->>'page_url', r->>'link_url',
    NULLIF(r->>'ad_start_date','')::timestamptz, COALESCE((r->>'is_active')::boolean, true),
    COALESCE((r->>'active_days')::int, 0), COALESCE((r->>'active_ads_count')::int, 1),
    r->>'status', r->>'structure', r->>'product_type', r->>'search_term',
    COALESCE((r->>'quality_score')::int, 0), now()
  FROM jsonb_array_elements(p_rows) AS r
  ON CONFLICT (ad_archive_id) DO UPDATE SET
    page_name = EXCLUDED.page_name, category = EXCLUDED.category, language = EXCLUDED.language,
    headline = EXCLUDED.headline, description = EXCLUDED.description,
    creative_url = EXCLUDED.creative_url, creative_type = EXCLUDED.creative_type,
    ad_snapshot_url = EXCLUDED.ad_snapshot_url, link_url = EXCLUDED.link_url,
    is_active = EXCLUDED.is_active, active_days = EXCLUDED.active_days,
    active_ads_count = EXCLUDED.active_ads_count, status = EXCLUDED.status,
    structure = EXCLUDED.structure, product_type = EXCLUDED.product_type,
    quality_score = EXCLUDED.quality_score, last_seen = now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;