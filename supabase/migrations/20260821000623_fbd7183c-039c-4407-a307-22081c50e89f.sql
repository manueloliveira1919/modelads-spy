-- 1) stale global só com cobertura explicitamente completa
CREATE OR REPLACE FUNCTION public.mining_deactivate_stale(
  p_started_at timestamptz,
  p_coverage text DEFAULT 'partial'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  -- Ausência de um anúncio em run PARCIAL significa apenas "não revisado".
  -- Nunca pode desativar anúncio nem tornar oferta qualificada invisível.
  IF COALESCE(p_coverage, 'partial') <> 'full' THEN
    RETURN 0;
  END IF;

  UPDATE public.meta_offers SET is_active = false
  WHERE is_active = true AND last_seen < p_started_at;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 2) vitrine orientada a OFERTAS, sem depender de is_active de anúncio individual
CREATE OR REPLACE FUNCTION public.list_active_offers()
RETURNS TABLE(id uuid, ad_archive_id text, page_id text, page_name text, category text, language text, headline text, description text, creative_url text, creative_type text, ad_snapshot_url text, page_url text, link_url text, active_days integer, active_ads_count integer, status text, structure text, product_type text, ad_start_date timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id, rep.ad_archive_id, o.page_id,
    COALESCE(o.page_name, rep.page_name), COALESCE(o.category, rep.category),
    COALESCE(o.language, rep.language),
    COALESCE(NULLIF(o.product_title,''), rep.headline), rep.description,
    rep.creative_url, rep.creative_type, rep.ad_snapshot_url,
    COALESCE(rep.page_url, 'https://www.facebook.com/' || o.page_id), rep.link_url,
    o.active_days, o.ads_count, o.status,
    COALESCE(o.structure, rep.structure), COALESCE(o.product_type, rep.product_type),
    o.first_ad_start
  FROM public.offers o
  JOIN LATERAL (
    SELECT * FROM public.meta_offers m WHERE m.offer_id = o.id
    ORDER BY (m.creative_url IS NOT NULL) DESC, m.ad_start_date DESC NULLS LAST
    LIMIT 1
  ) rep ON true
  WHERE o.visible AND o.qualified
  ORDER BY o.confidence DESC, o.ads_count DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_offer_row(p_id uuid)
RETURNS TABLE(id uuid, ad_archive_id text, page_id text, page_name text, category text, language text, headline text, description text, creative_url text, creative_type text, ad_snapshot_url text, page_url text, link_url text, active_days integer, active_ads_count integer, status text, structure text, product_type text, ad_start_date timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id, rep.ad_archive_id, o.page_id,
    COALESCE(o.page_name, rep.page_name), COALESCE(o.category, rep.category),
    COALESCE(o.language, rep.language),
    COALESCE(NULLIF(o.product_title,''), rep.headline), rep.description,
    rep.creative_url, rep.creative_type, rep.ad_snapshot_url,
    COALESCE(rep.page_url, 'https://www.facebook.com/' || o.page_id), rep.link_url,
    o.active_days, o.ads_count, o.status,
    COALESCE(o.structure, rep.structure), COALESCE(o.product_type, rep.product_type),
    o.first_ad_start
  FROM public.offers o
  JOIN LATERAL (
    SELECT * FROM public.meta_offers m WHERE m.offer_id = o.id
    ORDER BY (m.creative_url IS NOT NULL) DESC, m.ad_start_date DESC NULLS LAST
    LIMIT 1
  ) rep ON true
  WHERE o.id = p_id;
$function$;

CREATE OR REPLACE FUNCTION public.list_offer_ads(p_id uuid)
RETURNS TABLE(id uuid, ad_archive_id text, headline text, description text, creative_url text, creative_type text, link_url text, ad_start_date timestamptz, active_days integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT m.id, m.ad_archive_id, m.headline, m.description, m.creative_url,
         m.creative_type, m.link_url, m.ad_start_date, m.active_days
  FROM public.meta_offers m
  JOIN public.offers o ON o.id = m.offer_id
  WHERE m.offer_id = p_id
  ORDER BY m.ad_start_date DESC NULLS LAST;
$function$;

REVOKE ALL ON FUNCTION public.list_active_offers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_offer_row(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_offer_ads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_offers() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_offer_row(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_offer_ads(uuid) TO anon, authenticated, service_role;