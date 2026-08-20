-- 1. Colunas novas (nada é apagado)
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS confidence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.search_keywords
  ADD COLUMN IF NOT EXISTS cycle_no integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS offers_visible_conf_idx ON public.offers (visible, confidence DESC);
CREATE INDEX IF NOT EXISTS search_keywords_cycle_idx ON public.search_keywords (is_active, cycle_no);

UPDATE public.mining_settings SET keywords_per_run = 100 WHERE singleton;

-- 2. Categoria canônica (as 8 oficiais); NULL = fora do catálogo
CREATE OR REPLACE FUNCTION public.offer_canonical_category(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE public.offer_norm_title(coalesce(p,''))
    WHEN 'saude' THEN 'Saúde'
    WHEN 'nutra' THEN 'Saúde'
    WHEN 'emagrecimento' THEN 'Fitness'
    WHEN 'fitness' THEN 'Fitness'
    WHEN 'financas' THEN 'Finanças'
    WHEN 'relacionamento' THEN 'Relacionamento'
    WHEN 'espiritualidade' THEN 'Espiritualidade'
    WHEN 'beleza' THEN 'Beleza'
    WHEN 'low ticket' THEN 'Low Ticket'
    WHEN 'negocios' THEN 'Negócios'
    WHEN 'info' THEN 'Negócios'
    WHEN 'mentoria' THEN 'Negócios'
    WHEN 'mentorias' THEN 'Negócios'
    ELSE NULL
  END;
$$;

-- 3. Ruído de entretenimento (apps de leitura, novela, dorama, streaming)
CREATE OR REPLACE FUNCTION public.offer_is_entertainment(p_title text, p_page text, p_landing text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (
    coalesce(p_landing,'') ~* '(book|novel|drama|manga|comic|read|webtoon|shortmax|reelshort|dramabox)'
    OR coalesce(p_page,'') ~* '(book|livro|leitura|reading|novel|drama|dorama|conto)'
    OR coalesce(p_title,'') ~* '(cap[íi]tulo|novela|dorama|assistir (agora|gr[áa]tis)|continuar lendo|ler mais|leia (mais|agora)|romance|s[ée]rie completa|epis[óo]dio)'
  );
$$;

-- 4. Recompute com confiança + visibilidade
CREATE OR REPLACE FUNCTION public.offers_recompute(p_ids uuid[] DEFAULT NULL::uuid[])
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
      ELSE 'testando' END,
    confidence = LEAST(100,
        (CASE WHEN COALESCE(o.landing_key, s.landing) IS NOT NULL THEN 30 ELSE 0 END)
      + (CASE WHEN s.has_price THEN 15 ELSE 0 END)
      + (CASE WHEN COALESCE(s.structure, o.structure) IS NOT NULL THEN 10 ELSE 0 END)
      + (CASE WHEN s.has_creative THEN 5 ELSE 0 END)
      + (CASE WHEN s.cnt >= 30 THEN 25 WHEN s.cnt >= 20 THEN 20 WHEN s.cnt >= 10 THEN 14 WHEN s.cnt >= 5 THEN 7 ELSE 0 END)
      + (CASE WHEN s.days >= 30 THEN 20 WHEN s.days >= 15 THEN 14 WHEN s.days >= 5 THEN 8 ELSE 0 END)
    ),
    visible = (
      s.days >= 5 AND s.cnt >= 10
      AND COALESCE(o.landing_key, s.landing) IS NOT NULL
      AND COALESCE(s.language, o.language) = 'PT'
      AND public.offer_canonical_category(COALESCE(s.category, o.category)) IS NOT NULL
      AND NOT public.offer_is_entertainment(
            COALESCE(NULLIF(s.title,''), o.product_title),
            COALESCE(s.page_name, o.page_name),
            COALESCE(o.landing_key, s.landing))
      AND COALESCE(s.last_seen, o.last_seen) > now() - interval '14 days'
    )
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
      mode() WITHIN GROUP (ORDER BY m.product_type) AS product_type,
      bool_or(COALESCE(m.headline,'') ~ 'R\$' OR COALESCE(m.description,'') ~ 'R\$') AS has_price,
      bool_or(m.creative_url IS NOT NULL) AS has_creative
    FROM public.meta_offers m
    WHERE m.offer_id IS NOT NULL
      AND (p_ids IS NULL OR m.offer_id = ANY(p_ids))
    GROUP BY m.offer_id
  ) s
  WHERE o.id = s.offer_id;

  UPDATE public.offers o
  SET ads_count = 0, qualified = false, visible = false, confidence = 0, reject_reason = 'sem_anuncios'
  WHERE (p_ids IS NULL OR o.id = ANY(p_ids))
    AND NOT EXISTS (SELECT 1 FROM public.meta_offers m WHERE m.offer_id = o.id);

  -- Normaliza a categoria para o catálogo oficial (sem apagar nada)
  UPDATE public.offers o
  SET category = public.offer_canonical_category(o.category)
  WHERE (p_ids IS NULL OR o.id = ANY(p_ids))
    AND public.offer_canonical_category(o.category) IS NOT NULL
    AND public.offer_canonical_category(o.category) <> o.category;
END;
$$;

-- 5. Reavaliação geral de fim de ciclo (só visibilidade, nunca remoção)
CREATE OR REPLACE FUNCTION public.offers_refresh_visibility()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v int;
BEGIN
  PERFORM public.offers_recompute(NULL);
  SELECT count(*)::int INTO v FROM public.offers WHERE visible;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.offers_refresh_visibility() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offers_refresh_visibility() TO service_role;

-- 6. Vitrine: só ofertas visíveis, ordenadas por confiança
CREATE OR REPLACE FUNCTION public.list_active_offers()
RETURNS TABLE(id uuid, ad_archive_id text, page_id text, page_name text, category text, language text, headline text, description text, creative_url text, creative_type text, ad_snapshot_url text, page_url text, link_url text, active_days integer, active_ads_count integer, status text, structure text, product_type text, ad_start_date timestamp with time zone)
LANGUAGE sql STABLE SET search_path = public AS $$
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
  WHERE o.visible
  ORDER BY o.confidence DESC, o.ads_count DESC;
$$;

-- 7. Aplica a nova régua ao acervo atual (só marca visibilidade)
SELECT public.offers_refresh_visibility();