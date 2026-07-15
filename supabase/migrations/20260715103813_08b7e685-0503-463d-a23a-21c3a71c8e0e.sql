CREATE OR REPLACE FUNCTION public.list_active_offer_pages()
RETURNS SETOF public.meta_offers
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (page_id) *
  FROM public.meta_offers
  WHERE is_active = true
  ORDER BY page_id, active_ads_count DESC, active_days DESC;
$$;