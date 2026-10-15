CREATE OR REPLACE FUNCTION public.current_plan_code(_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN 'free'
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN NOT public.has_active_subscription(_user_id) THEN 'free'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'premium') THEN 'premium'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role IN ('pro','plus')) THEN 'pro'
    ELSE 'starter'
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  fname text := NEW.raw_user_meta_data->>'first_name';
  lname text := NEW.raw_user_meta_data->>'last_name';
  ph    text := NEW.raw_user_meta_data->>'phone';
  disp  text := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(trim(concat_ws(' ', fname, lname)), ''),
    split_part(NEW.email, '@', 1)
  );
BEGIN
  INSERT INTO public.profiles(id, email, display_name, first_name, last_name, phone)
  VALUES (NEW.id, NEW.email, disp, fname, lname, ph)
  ON CONFLICT (id) DO NOTHING;
  -- Sem função inicial: conta nova é "free" até ter assinatura paga ativa.
  BEGIN
    IF NEW.email IS NOT NULL THEN PERFORM public.cakto_claim_pending(NEW.id, NEW.email); END IF;
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_offers()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT public.is_user_suspended(auth.uid())
    AND public.has_feature(auth.uid(), 'vitrine_ofertas')
$$;
REVOKE ALL ON FUNCTION public.can_view_offers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_offers() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_active_offers(p_sort text DEFAULT 'confidence'::text)
 RETURNS TABLE(id uuid, ad_archive_id text, page_id text, page_name text, category text, language text, headline text, description text, creative_url text, creative_type text, ad_snapshot_url text, page_url text, link_url text, active_days integer, active_ads_count integer, status text, structure text, product_type text, ad_start_date timestamp with time zone, landing_price text, landing_structure text, landing_validated boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_offers() THEN RETURN; END IF;
  RETURN QUERY
  SELECT o.id, rep.ad_archive_id, o.page_id,
    COALESCE(o.page_name, rep.page_name), COALESCE(o.category, rep.category),
    COALESCE(o.language, rep.language),
    COALESCE(NULLIF(o.product_title,''), rep.headline), rep.description,
    rep.creative_url, rep.creative_type, rep.ad_snapshot_url,
    COALESCE(rep.page_url, 'https://www.facebook.com/' || o.page_id), rep.link_url,
    o.active_days, o.ads_count, o.status,
    COALESCE(o.structure, rep.structure), COALESCE(o.product_type, rep.product_type),
    o.first_ad_start, o.landing_price, o.landing_structure, o.landing_validated
  FROM public.offers o
  JOIN LATERAL (
    SELECT * FROM public.meta_offers m WHERE m.offer_id = o.id
    ORDER BY (m.creative_url IS NOT NULL) DESC, m.ad_start_date DESC NULLS LAST
    LIMIT 1
  ) rep ON true
  WHERE o.visible AND o.qualified
    AND o.commercial_quality IS DISTINCT FROM 'entertainment'
  ORDER BY
    CASE WHEN p_sort = 'novidade' THEN o.first_qualified_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'novidade' THEN NULL ELSE o.confidence END DESC NULLS LAST,
    o.ads_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_offer_row(p_id uuid)
 RETURNS TABLE(id uuid, ad_archive_id text, page_id text, page_name text, category text, language text, headline text, description text, creative_url text, creative_type text, ad_snapshot_url text, page_url text, link_url text, active_days integer, active_ads_count integer, status text, structure text, product_type text, ad_start_date timestamp with time zone, landing_price text, landing_structure text, landing_validated boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT o.id, rep.ad_archive_id, o.page_id,
    COALESCE(o.page_name, rep.page_name), COALESCE(o.category, rep.category),
    COALESCE(o.language, rep.language),
    COALESCE(NULLIF(o.product_title,''), rep.headline), rep.description,
    rep.creative_url, rep.creative_type, rep.ad_snapshot_url,
    COALESCE(rep.page_url, 'https://www.facebook.com/' || o.page_id), rep.link_url,
    o.active_days, o.ads_count, o.status,
    COALESCE(o.structure, rep.structure), COALESCE(o.product_type, rep.product_type),
    o.first_ad_start, o.landing_price, o.landing_structure, o.landing_validated
  FROM public.offers o
  JOIN LATERAL (
    SELECT * FROM public.meta_offers m WHERE m.offer_id = o.id
    ORDER BY (m.creative_url IS NOT NULL) DESC, m.ad_start_date DESC NULLS LAST
    LIMIT 1
  ) rep ON true
  WHERE o.id = p_id AND public.can_view_offers();
$$;

CREATE OR REPLACE FUNCTION public.list_offer_ads(p_id uuid)
 RETURNS TABLE(id uuid, ad_archive_id text, headline text, description text, creative_url text, creative_type text, link_url text, ad_start_date timestamp with time zone, active_days integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.id, m.ad_archive_id, m.headline, m.description, m.creative_url,
         m.creative_type, m.link_url, m.ad_start_date, m.active_days
  FROM public.meta_offers m
  JOIN public.offers o ON o.id = m.offer_id
  WHERE m.offer_id = p_id AND public.can_view_offers()
  ORDER BY m.ad_start_date DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.list_active_offers(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_offer_row(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_offer_ads(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_active_offer_pages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_active_offers(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_offer_row(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_offer_ads(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_active_offer_pages() TO authenticated, service_role;

DROP POLICY IF EXISTS "Public can read active offers" ON public.meta_offers;
CREATE POLICY "Paid plans can read active offers" ON public.meta_offers
  FOR SELECT TO authenticated
  USING (is_active = true AND public.can_view_offers());
CREATE POLICY "Admins can read all ad rows" ON public.meta_offers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));