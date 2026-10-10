CREATE TABLE public.extension_rate_limits (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  requests_per_minute integer NOT NULL DEFAULT 30 CHECK (requests_per_minute BETWEEN 1 AND 10000),
  ads_per_hour integer NOT NULL DEFAULT 1000 CHECK (ads_per_hour BETWEEN 1 AND 1000000),
  ads_per_day integer NOT NULL DEFAULT 5000 CHECK (ads_per_day BETWEEN 1 AND 10000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.extension_rate_limits (id) VALUES (true);
GRANT SELECT, UPDATE ON public.extension_rate_limits TO authenticated;
GRANT ALL ON public.extension_rate_limits TO service_role;
ALTER TABLE public.extension_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate limits" ON public.extension_rate_limits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update rate limits" ON public.extension_rate_limits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.extension_rate_events (
  id bigserial PRIMARY KEY,
  token_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  is_request boolean NOT NULL DEFAULT true,
  ads integer NOT NULL DEFAULT 0
);
CREATE INDEX extension_rate_events_token_at ON public.extension_rate_events (token_id, at);
GRANT ALL ON public.extension_rate_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.extension_rate_events_id_seq TO service_role;
ALTER TABLE public.extension_rate_events ENABLE ROW LEVEL SECURITY;

-- Counts and records one call (request and/or ads) for a token; returns retry_after when over limit.
CREATE OR REPLACE FUNCTION public.extension_rate_check(p_token_hash text, p_ads integer DEFAULT 0, p_count_request boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token uuid; cfg public.extension_rate_limits; v_n bigint; v_oldest timestamptz; v_retry int;
BEGIN
  SELECT id INTO v_token FROM extension_tokens WHERE token_hash = p_token_hash;
  IF v_token IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_token::text));
  SELECT * INTO cfg FROM extension_rate_limits WHERE id;

  IF p_count_request THEN
    SELECT count(*), min(at) INTO v_n, v_oldest FROM extension_rate_events
      WHERE token_id = v_token AND is_request AND at > now() - interval '1 minute';
    IF v_n >= cfg.requests_per_minute THEN
      v_retry := greatest(1, ceil(extract(epoch FROM (v_oldest + interval '1 minute' - now())))::int);
      RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited', 'limit', 'requests_per_minute', 'max', cfg.requests_per_minute, 'retry_after', v_retry,
        'message', format('Limite de %s requisições por minuto atingido. Aguarde %s segundos.', cfg.requests_per_minute, v_retry));
    END IF;
  END IF;

  IF p_ads > 0 THEN
    -- hourly window: find when enough old ads expire to fit p_ads
    SELECT coalesce(sum(ads),0) INTO v_n FROM extension_rate_events WHERE token_id = v_token AND at > now() - interval '1 hour';
    IF v_n + p_ads > cfg.ads_per_hour THEN
      SELECT at INTO v_oldest FROM (
        SELECT at, sum(ads) OVER (ORDER BY at) AS cum FROM extension_rate_events
        WHERE token_id = v_token AND at > now() - interval '1 hour' AND ads > 0) s
        WHERE v_n - cum + p_ads <= cfg.ads_per_hour ORDER BY at LIMIT 1;
      v_retry := CASE WHEN v_oldest IS NULL THEN 3600 ELSE greatest(1, ceil(extract(epoch FROM (v_oldest + interval '1 hour' - now())))::int) END;
      RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited', 'limit', 'ads_per_hour', 'max', cfg.ads_per_hour, 'used', v_n, 'retry_after', v_retry,
        'message', format('Limite de %s anúncios por hora atingido. Aguarde %s segundos.', cfg.ads_per_hour, v_retry));
    END IF;
    SELECT coalesce(sum(ads),0) INTO v_n FROM extension_rate_events WHERE token_id = v_token AND at > now() - interval '1 day';
    IF v_n + p_ads > cfg.ads_per_day THEN
      SELECT at INTO v_oldest FROM (
        SELECT at, sum(ads) OVER (ORDER BY at) AS cum FROM extension_rate_events
        WHERE token_id = v_token AND at > now() - interval '1 day' AND ads > 0) s
        WHERE v_n - cum + p_ads <= cfg.ads_per_day ORDER BY at LIMIT 1;
      v_retry := CASE WHEN v_oldest IS NULL THEN 86400 ELSE greatest(1, ceil(extract(epoch FROM (v_oldest + interval '1 day' - now())))::int) END;
      RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited', 'limit', 'ads_per_day', 'max', cfg.ads_per_day, 'used', v_n, 'retry_after', v_retry,
        'message', format('Limite de %s anúncios por dia atingido. Aguarde %s segundos.', cfg.ads_per_day, v_retry));
    END IF;
  END IF;

  INSERT INTO extension_rate_events (token_id, is_request, ads) VALUES (v_token, p_count_request, greatest(p_ads,0));
  IF random() < 0.02 THEN DELETE FROM extension_rate_events WHERE at < now() - interval '2 days'; END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.extension_rate_check(text, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extension_rate_check(text, integer, boolean) TO service_role;