CREATE TABLE public.extension_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_archive_id text NOT NULL,
  keyword_used text,
  page_id text,
  page_name text,
  creative_text text,
  media_url text,
  link_url text,
  active_days integer,
  repeated_ads_count integer,
  submitted_by uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','rejected')),
  run_id uuid REFERENCES public.meta_refresh_runs(id) ON DELETE SET NULL,
  processed_at timestamptz
);
CREATE UNIQUE INDEX extension_candidates_live_uniq ON public.extension_candidates(ad_archive_id) WHERE status IN ('pending','processed');
CREATE INDEX extension_candidates_status_idx ON public.extension_candidates(status, submitted_at);
GRANT SELECT ON public.extension_candidates TO authenticated;
GRANT ALL ON public.extension_candidates TO service_role;
ALTER TABLE public.extension_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read extension candidates" ON public.extension_candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.extension_submit_candidates(p_user_id uuid, p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; v_ins int := 0; v_upd int := 0; v_skip int := 0; v_status text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    SELECT status INTO v_status FROM public.extension_candidates
      WHERE ad_archive_id = r->>'ad_archive_id' AND status IN ('pending','processed') LIMIT 1;
    IF v_status IS NULL THEN
      INSERT INTO public.extension_candidates(ad_archive_id, keyword_used, page_id, page_name, creative_text, media_url, link_url, active_days, repeated_ads_count, submitted_by)
      VALUES (r->>'ad_archive_id', r->>'keyword_used', r->>'page_id', r->>'page_name', r->>'creative_text', r->>'media_url', r->>'link_url',
              NULLIF(r->>'active_days','')::int, NULLIF(r->>'repeated_ads_count','')::int, p_user_id);
      v_ins := v_ins + 1;
    ELSIF v_status = 'pending' THEN
      UPDATE public.extension_candidates SET
        keyword_used = COALESCE(r->>'keyword_used', keyword_used),
        page_id = COALESCE(r->>'page_id', page_id),
        page_name = COALESCE(r->>'page_name', page_name),
        creative_text = COALESCE(r->>'creative_text', creative_text),
        media_url = COALESCE(r->>'media_url', media_url),
        link_url = COALESCE(r->>'link_url', link_url),
        active_days = COALESCE(NULLIF(r->>'active_days','')::int, active_days),
        repeated_ads_count = COALESCE(NULLIF(r->>'repeated_ads_count','')::int, repeated_ads_count),
        submitted_at = now()
      WHERE ad_archive_id = r->>'ad_archive_id' AND status = 'pending';
      v_upd := v_upd + 1;
    ELSE
      v_skip := v_skip + 1;
    END IF;
    v_status := NULL;
  END LOOP;
  RETURN jsonb_build_object('inserted', v_ins, 'updated', v_upd, 'skipped', v_skip);
END $$;
REVOKE ALL ON FUNCTION public.extension_submit_candidates(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extension_submit_candidates(uuid, jsonb) TO service_role;