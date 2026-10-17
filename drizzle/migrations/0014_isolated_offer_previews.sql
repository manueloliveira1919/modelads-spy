CREATE TABLE public.offer_previews (
 offer_id uuid PRIMARY KEY REFERENCES public.offers(id) ON DELETE CASCADE,
 url text,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ok','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 claim_token uuid,
 claimed_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error text,
 source_ad_id text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'ok' OR url IS NOT NULL)
);
GRANT SELECT ON public.offer_previews TO authenticated;
GRANT ALL ON public.offer_previews TO service_role;
ALTER TABLE public.offer_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Paid users read offer previews" ON public.offer_previews FOR SELECT TO authenticated USING (public.can_view_offers());
CREATE INDEX offer_previews_pending_idx ON public.offer_previews(next_attempt_at) WHERE status <> 'ok' AND attempts < 3;
CREATE OR REPLACE FUNCTION public.claim_offer_previews()
RETURNS SETOF public.offer_previews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.offer_previews(offer_id)
 SELECT id FROM public.offers WHERE visible AND qualified
 ON CONFLICT(offer_id) DO NOTHING;
 UPDATE public.offer_previews SET status='failed', claim_token=NULL, claimed_at=NULL,
 last_error='Execução interrompida', next_attempt_at=now(), updated_at=now()
 WHERE claim_token IS NOT NULL AND claimed_at < now()-interval '10 minutes';
 RETURN QUERY
 WITH selected AS (
  SELECT p.offer_id FROM public.offer_previews p JOIN public.offers o ON o.id=p.offer_id
  WHERE p.status <> 'ok' AND p.attempts < 3 AND p.claim_token IS NULL
    AND p.next_attempt_at <= now() AND o.visible AND o.qualified
  ORDER BY p.attempts, p.next_attempt_at, p.offer_id
  LIMIT 10 FOR UPDATE OF p SKIP LOCKED
 )
 UPDATE public.offer_previews p SET attempts=p.attempts+1, claim_token=gen_random_uuid(),
 claimed_at=now(), status='pending', updated_at=now()
 FROM selected s WHERE p.offer_id=s.offer_id RETURNING p.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_offer_previews() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer_previews() TO service_role;
CREATE POLICY "Public offer cover files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='offer-previews');
COMMENT ON TABLE public.offer_previews IS 'Creative-only cover queue. Independent of mining; service-only writes, max ten per claim and three attempts.';