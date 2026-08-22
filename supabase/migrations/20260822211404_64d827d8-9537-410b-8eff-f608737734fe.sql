ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS commercial_quality text,
  ADD COLUMN IF NOT EXISTS quality_reasons jsonb,
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_commercial_quality_check
  CHECK (commercial_quality IS NULL OR commercial_quality IN ('commercial','suspicious','entertainment'));

CREATE OR REPLACE FUNCTION public.offers_quality_snapshot(p_ids uuid[] DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  page_name text,
  product_title text,
  landing_key text,
  category text,
  language text,
  ads_count integer,
  active_days integer,
  visible boolean,
  qualified boolean,
  ads jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.page_name, o.product_title, o.landing_key, o.category, o.language,
         o.ads_count, o.active_days, o.visible, o.qualified,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'headline', m.headline,
             'description', m.description,
             'link_url', m.link_url
           ))
           FROM public.meta_offers m
           WHERE m.offer_id = o.id
         ), '[]'::jsonb) AS ads
  FROM public.offers o
  WHERE p_ids IS NULL OR o.id = ANY(p_ids);
$$;