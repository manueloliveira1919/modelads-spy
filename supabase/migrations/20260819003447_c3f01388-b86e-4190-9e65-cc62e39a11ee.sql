-- ============ Normalização (fonte única de verdade do agrupamento) ============
CREATE OR REPLACE FUNCTION public.offer_norm_title(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(trim(regexp_replace(
    regexp_replace(lower(translate(COALESCE(p,''),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
      '[^a-z0-9]+', ' ', 'g'),
    '\s+', ' ', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.offer_title_tokens(p text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT t FROM unnest(string_to_array(public.offer_norm_title(p), ' ')) AS t
    WHERE length(t) > 2 AND t !~ '^[0-9]+$'
      AND t <> ALL (ARRAY['de','da','do','das','dos','para','por','com','uma','que','seu','sua','the','of','and','for','your','you','this'])
  ), '{}'::text[]);
$$;

CREATE OR REPLACE FUNCTION public.offer_title_similarity(a text[], b text[])
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(array_length(a,1),0) = 0 OR COALESCE(array_length(b,1),0) = 0 THEN 0
    ELSE (SELECT count(*) FROM unnest(a) x WHERE x = ANY(b))::numeric
         / NULLIF((SELECT count(DISTINCT y) FROM unnest(a || b) y), 0)
  END;
$$;

CREATE OR REPLACE FUNCTION public.offer_norm_link(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v text; h text;
BEGIN
  v := lower(trim(COALESCE(p, '')));
  IF v = '' THEN RETURN NULL; END IF;
  v := regexp_replace(v, '^[a-z]+://', '');
  v := split_part(v, '?', 1);
  v := split_part(v, '#', 1);
  v := regexp_replace(v, '^www\.', '');
  v := regexp_replace(v, '/+$', '');
  h := split_part(v, '/', 1);
  IF h = '' OR h LIKE '%facebook.com' OR h LIKE '%fb.com' THEN RETURN NULL; END IF;
  RETURN v;
END;
$$;

-- page_id NUNCA é identidade sozinho: sempre combinado com destino ou título.
CREATE OR REPLACE FUNCTION public.offer_group_key(p_page_id text, p_link text, p_title text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(p_page_id,'') || '::' || COALESCE(
    NULLIF(public.offer_norm_link(p_link), ''),
    NULLIF(left(public.offer_norm_title(p_title), 120), ''),
    'sem-identidade'
  );
$$;

-- ============ Tabela de OFERTAS (unidade principal) ============
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key text NOT NULL UNIQUE,
  page_id text NOT NULL,
  page_name text,
  product_title text,
  landing_key text,
  category text,
  language text,
  structure text,
  product_type text,
  ads_count integer NOT NULL DEFAULT 0,
  first_ad_start timestamptz,
  active_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'testando',
  qualified boolean NOT NULL DEFAULT false,
  reject_reason text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers são públicas para leitura" ON public.offers;
CREATE POLICY "offers são públicas para leitura"
ON public.offers FOR SELECT USING (true);

DROP TRIGGER IF EXISTS set_updated_at ON public.offers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meta_offers ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS meta_offers_offer_id_idx ON public.meta_offers(offer_id);
CREATE INDEX IF NOT EXISTS offers_page_id_idx ON public.offers(page_id);
CREATE INDEX IF NOT EXISTS offers_qualified_idx ON public.offers(qualified);

-- ============ Recalculo das métricas no nível da OFERTA ============
-- 5+ dias E 10+ anúncios DA MESMA OFERTA. Sem teto de anúncios.
CREATE OR REPLACE FUNCTION public.offers_recompute(p_ids uuid[] DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offers o SET
    ads_count = s.cnt,
    first_ad_start = s.first_start,
    active_days = CASE WHEN s.first_start IS NULL THEN 0
      ELSE GREATEST(0, floor(extract(epoch FROM (now() - s.first_start)) / 86400))::int END,
    last_seen = GREATEST(o.last_seen, COALESCE(s.last_seen, o.last_seen)),
    page_name = COALESCE(s.page_name, o.page_name),
    product_title = COALESCE(NULLIF(s.title,''), o.product_title),
    landing_key = COALESCE(o.landing_key, s.landing),
    category = COALESCE(s.category, o.category),
    language = COALESCE(s.language, o.language),
    structure = COALESCE(s.structure, o.structure),
    product_type = COALESCE(s.product_type, o.product_type),
    qualified = (s.days >= 5 AND s.cnt >= 10),
    reject_reason = CASE
      WHEN s.days >= 5 AND s.cnt >= 10 THEN NULL
      WHEN s.days < 5 AND s.cnt < 10 THEN 'dias_e_anuncios'
      WHEN s.days < 5 THEN 'poucos_dias'
      ELSE 'poucos_anuncios' END,
    status = CASE
      WHEN s.days >= 30 AND s.cnt >= 30 THEN 'escaladissimo'
      WHEN s.days >= 20 AND s.cnt >= 20 THEN 'escalado'
      ELSE 'testando' END
  FROM (
    SELECT m.offer_id,
      count(*)::int AS cnt,
      min(m.ad_start_date) AS first_start,
      CASE WHEN min(m.ad_start_date) IS NULL THEN 0
        ELSE GREATEST(0, floor(extract(epoch FROM (now() - min(m.ad_start_date))) / 86400))::int END AS days,
      max(m.last_seen) AS last_seen,
      (array_agg(m.page_name) FILTER (WHERE m.page_name IS NOT NULL))[1] AS page_name,
      (array_agg(m.headline ORDER BY length(COALESCE(m.headline,'')) DESC))[1] AS title,
      (array_agg(public.offer_norm_link(m.link_url)) FILTER (WHERE public.offer_norm_link(m.link_url) IS NOT NULL))[1] AS landing,
      mode() WITHIN GROUP (ORDER BY m.category) AS category,
      mode() WITHIN GROUP (ORDER BY m.language) AS language,
      mode() WITHIN GROUP (ORDER BY m.structure) AS structure,
      mode() WITHIN GROUP (ORDER BY m.product_type) AS product_type
    FROM public.meta_offers m
    WHERE m.offer_id IS NOT NULL
      AND (p_ids IS NULL OR m.offer_id = ANY(p_ids))
    GROUP BY m.offer_id
  ) s
  WHERE o.id = s.offer_id;

  -- ofertas que ficaram sem nenhum anúncio ligado
  UPDATE public.offers o SET ads_count = 0, qualified = false, reject_reason = 'sem_anuncios'
  WHERE (p_ids IS NULL OR o.id = ANY(p_ids))
    AND NOT EXISTS (SELECT 1 FROM public.meta_offers m WHERE m.offer_id = o.id);
END;
$$;

-- ============ Liga anúncios classificados às ofertas ============
CREATE OR REPLACE FUNCTION public.offers_attach_ads(p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb; v_gk text; v_link text; v_tokens text[]; v_offer uuid;
  ids uuid[] := '{}'; v_qualified int; v_rejected int;
BEGIN
  FOR r IN SELECT value FROM jsonb_array_elements(COALESCE(p_rows,'[]'::jsonb)) LOOP
    v_link := public.offer_norm_link(r->>'link_url');
    v_gk := public.offer_group_key(r->>'page_id', r->>'link_url', r->>'headline');

    SELECT id INTO v_offer FROM public.offers WHERE group_key = v_gk;

    IF v_offer IS NULL THEN
      v_tokens := public.offer_title_tokens(r->>'headline');
      SELECT o.id INTO v_offer FROM public.offers o
      WHERE o.page_id = r->>'page_id'
        AND (v_link IS NULL OR o.landing_key IS NULL OR o.landing_key = v_link)
        AND public.offer_title_similarity(public.offer_title_tokens(o.product_title), v_tokens) >= 0.72
      ORDER BY o.ads_count DESC
      LIMIT 1;
    END IF;

    IF v_offer IS NULL THEN
      INSERT INTO public.offers (group_key, page_id, page_name, product_title, landing_key, category, language, structure, product_type)
      VALUES (v_gk, r->>'page_id', r->>'page_name', r->>'headline', v_link,
              r->>'category', r->>'language', r->>'structure', r->>'product_type')
      ON CONFLICT (group_key) DO UPDATE SET last_seen = now()
      RETURNING id INTO v_offer;
    ELSE
      UPDATE public.offers SET last_seen = now() WHERE id = v_offer;
    END IF;

    UPDATE public.meta_offers SET offer_id = v_offer WHERE ad_archive_id = r->>'ad_archive_id';
    IF NOT (v_offer = ANY(ids)) THEN ids := ids || v_offer; END IF;
  END LOOP;

  PERFORM public.offers_recompute(ids);

  SELECT count(*) FILTER (WHERE qualified), count(*) FILTER (WHERE NOT qualified)
  INTO v_qualified, v_rejected
  FROM public.offers WHERE id = ANY(ids);

  RETURN jsonb_build_object(
    'offers_touched', COALESCE(array_length(ids,1),0),
    'offers_qualified', COALESCE(v_qualified,0),
    'offers_rejected', COALESCE(v_rejected,0)
  );
END;
$$;

-- ============ Leitura: 1 card = 1 oferta ============
CREATE OR REPLACE FUNCTION public.list_active_offers()
RETURNS TABLE(
  id uuid, ad_archive_id text, page_id text, page_name text, category text, language text,
  headline text, description text, creative_url text, creative_type text, ad_snapshot_url text,
  page_url text, link_url text, active_days integer, active_ads_count integer, status text,
  structure text, product_type text, ad_start_date timestamptz
) LANGUAGE sql STABLE SET search_path = public AS $$
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
  WHERE o.qualified = true;
$$;

CREATE OR REPLACE FUNCTION public.get_offer_row(p_id uuid)
RETURNS TABLE(
  id uuid, ad_archive_id text, page_id text, page_name text, category text, language text,
  headline text, description text, creative_url text, creative_type text, ad_snapshot_url text,
  page_url text, link_url text, active_days integer, active_ads_count integer, status text,
  structure text, product_type text, ad_start_date timestamptz
) LANGUAGE sql STABLE SET search_path = public AS $$
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
$$;

-- Anúncios (evidências) dentro da oferta
CREATE OR REPLACE FUNCTION public.list_offer_ads(p_id uuid)
RETURNS TABLE(
  id uuid, ad_archive_id text, headline text, description text, creative_url text,
  creative_type text, link_url text, ad_start_date timestamptz, active_days integer
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.id, m.ad_archive_id, m.headline, m.description, m.creative_url,
         m.creative_type, m.link_url, m.ad_start_date, m.active_days
  FROM public.meta_offers m
  WHERE m.offer_id = p_id
  ORDER BY m.ad_start_date DESC NULLS LAST;
$$;

-- ============ BACKFILL ============
DO $backfill$
DECLARE
  pg record; cand record; kept uuid[]; k uuid; merged boolean;
BEGIN
  INSERT INTO public.offers (group_key, page_id, page_name, product_title, landing_key, category, language, structure, product_type)
  SELECT t.gk, t.page_id,
    (array_agg(t.page_name))[1],
    (array_agg(t.headline ORDER BY length(COALESCE(t.headline,'')) DESC))[1],
    (array_agg(public.offer_norm_link(t.link_url)) FILTER (WHERE public.offer_norm_link(t.link_url) IS NOT NULL))[1],
    mode() WITHIN GROUP (ORDER BY t.category),
    mode() WITHIN GROUP (ORDER BY t.language),
    mode() WITHIN GROUP (ORDER BY t.structure),
    mode() WITHIN GROUP (ORDER BY t.product_type)
  FROM (SELECT m.*, public.offer_group_key(m.page_id, m.link_url, m.headline) AS gk FROM public.meta_offers m) t
  GROUP BY t.gk, t.page_id
  ON CONFLICT (group_key) DO NOTHING;

  UPDATE public.meta_offers m SET offer_id = o.id
  FROM public.offers o
  WHERE o.group_key = public.offer_group_key(m.page_id, m.link_url, m.headline)
    AND (m.offer_id IS DISTINCT FROM o.id);

  PERFORM public.offers_recompute(NULL);

  -- Passe de similaridade: funde ofertas do mesmo anunciante com títulos muito parecidos.
  FOR pg IN
    SELECT page_id FROM public.offers GROUP BY page_id HAVING count(*) BETWEEN 2 AND 300
  LOOP
    kept := '{}';
    FOR cand IN
      SELECT id, product_title, landing_key FROM public.offers
      WHERE page_id = pg.page_id ORDER BY ads_count DESC, id
    LOOP
      merged := false;
      FOREACH k IN ARRAY kept LOOP
        IF EXISTS (
          SELECT 1 FROM public.offers o WHERE o.id = k
            AND (cand.landing_key IS NULL OR o.landing_key IS NULL OR o.landing_key = cand.landing_key)
            AND public.offer_title_similarity(
                  public.offer_title_tokens(o.product_title),
                  public.offer_title_tokens(cand.product_title)) >= 0.72
        ) THEN
          UPDATE public.meta_offers SET offer_id = k WHERE offer_id = cand.id;
          DELETE FROM public.offers WHERE id = cand.id;
          merged := true;
          EXIT;
        END IF;
      END LOOP;
      IF NOT merged THEN kept := kept || cand.id; END IF;
    END LOOP;
  END LOOP;

  PERFORM public.offers_recompute(NULL);
END
$backfill$;

-- ============ Progresso da run com contadores de OFERTA ============
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
  v_off_formed bigint;
  v_off_qual bigint;
  v_off_rej bigint;
  v_summary jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.mining_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_run FROM public.meta_refresh_runs WHERE id = p_run_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

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
    COALESCE(SUM((l.details->>'lowRelevance')::bigint), 0),
    COALESCE(SUM((l.details->>'offers_touched')::bigint), 0),
    COALESCE(SUM((l.details->>'offers_qualified')::bigint), 0),
    COALESCE(SUM((l.details->>'offers_rejected')::bigint), 0)
  INTO v_ads_found, v_upserts, v_blacklist, v_language, v_category, v_duplicate, v_nolanding, v_lowrel,
       v_off_formed, v_off_qual, v_off_rej
  FROM public.mining_logs l
  WHERE l.kind = 'job' AND (l.details->>'run_id') = p_run_id::text;

  v_summary := COALESCE(v_run.details->'summary', '{}'::jsonb);

  IF v_ads_found = 0 THEN v_ads_found := COALESCE((v_summary->>'ads_found')::bigint, 0); END IF;
  IF v_upserts = 0 THEN v_upserts := COALESCE(v_run.offers_upserted, 0); END IF;
  IF v_off_formed = 0 THEN v_off_formed := COALESCE((v_summary->>'offers_formed')::bigint, 0); END IF;
  IF v_off_qual = 0 THEN v_off_qual := COALESCE((v_summary->>'offers_qualified')::bigint, 0); END IF;
  IF v_off_rej = 0 THEN v_off_rej := COALESCE((v_summary->>'offers_rejected')::bigint, 0); END IF;

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
    'offers_formed', v_off_formed,
    'offers_qualified', v_off_qual,
    'offers_rejected', v_off_rej,
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