
-- Trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- OFFERS
CREATE TABLE public.meta_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_archive_id text NOT NULL UNIQUE,
  page_id text NOT NULL,
  page_name text NOT NULL,
  category text NOT NULL,
  language text NOT NULL DEFAULT 'BR',
  country text NOT NULL DEFAULT 'BR',
  headline text,
  description text,
  creative_url text,
  creative_type text NOT NULL DEFAULT 'image',
  ad_snapshot_url text,
  page_url text,
  ad_start_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  active_days integer NOT NULL DEFAULT 0,
  active_ads_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'testando',
  structure text,
  product_type text,
  search_term text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meta_offers TO anon;
GRANT SELECT ON public.meta_offers TO authenticated;
GRANT ALL ON public.meta_offers TO service_role;

ALTER TABLE public.meta_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active offers"
  ON public.meta_offers FOR SELECT
  USING (is_active = true);

CREATE INDEX meta_offers_page_id_idx ON public.meta_offers (page_id);
CREATE INDEX meta_offers_category_idx ON public.meta_offers (category);
CREATE INDEX meta_offers_status_idx ON public.meta_offers (status);
CREATE INDEX meta_offers_last_seen_idx ON public.meta_offers (last_seen DESC);

CREATE TRIGGER update_meta_offers_updated_at
BEFORE UPDATE ON public.meta_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REFRESH RUNS
CREATE TABLE public.meta_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  offers_upserted integer NOT NULL DEFAULT 0,
  pages_seen integer NOT NULL DEFAULT 0,
  error text,
  details jsonb
);

GRANT SELECT ON public.meta_refresh_runs TO authenticated;
GRANT ALL ON public.meta_refresh_runs TO service_role;

ALTER TABLE public.meta_refresh_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read runs"
  ON public.meta_refresh_runs FOR SELECT
  TO authenticated USING (true);
