CREATE TABLE public.extension_preview_assets (
 ad_archive_id text PRIMARY KEY CHECK (ad_archive_id ~ '^[0-9A-Za-z_-]{3,64}$'),
 submitted_by uuid NOT NULL,
 url text,
 status text NOT NULL DEFAULT 'failed' CHECK (status IN ('ok','failed')),
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'ok' OR url IS NOT NULL)
);
GRANT SELECT ON public.extension_preview_assets TO authenticated;
GRANT ALL ON public.extension_preview_assets TO service_role;
ALTER TABLE public.extension_preview_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active admins read thumbnail diagnostics" ON public.extension_preview_assets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.is_user_suspended(auth.uid()));
CREATE INDEX extension_preview_assets_ready_idx ON public.extension_preview_assets(ad_archive_id) WHERE status='ok';
CREATE OR REPLACE FUNCTION public.attach_extension_preview(p_ad_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 INSERT INTO public.offer_previews(offer_id,url,status,source_ad_id,last_error,updated_at)
 SELECT DISTINCT m.offer_id,a.url,'ok',a.ad_archive_id,NULL,a.updated_at
 FROM public.extension_preview_assets a JOIN public.meta_offers m ON m.ad_archive_id=a.ad_archive_id
 WHERE a.ad_archive_id=p_ad_id AND a.status='ok' AND m.offer_id IS NOT NULL
 ON CONFLICT(offer_id) DO UPDATE SET url=EXCLUDED.url,status='ok',source_ad_id=EXCLUDED.source_ad_id,
 last_error=NULL,claim_token=NULL,claimed_at=NULL,updated_at=EXCLUDED.updated_at
 WHERE public.offer_previews.status <> 'ok' OR public.offer_previews.updated_at <= EXCLUDED.updated_at;
$$;
REVOKE ALL ON FUNCTION public.attach_extension_preview(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_extension_preview(text) TO service_role;
CREATE OR REPLACE FUNCTION public.extension_preview_asset_attached()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.attach_extension_preview(NEW.ad_archive_id);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.extension_preview_asset_attached() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.extension_preview_asset_attached() TO service_role;
CREATE TRIGGER extension_preview_asset_ready AFTER INSERT OR UPDATE OF url,status ON public.extension_preview_assets FOR EACH ROW EXECUTE FUNCTION public.extension_preview_asset_attached();
CREATE TRIGGER extension_preview_ad_linked AFTER INSERT OR UPDATE OF offer_id ON public.meta_offers FOR EACH ROW WHEN (NEW.offer_id IS NOT NULL) EXECUTE FUNCTION public.extension_preview_asset_attached();
CREATE OR REPLACE FUNCTION public.claim_offer_previews()
RETURNS SETOF public.offer_previews LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT * FROM public.offer_previews WHERE false;
$$;
REVOKE ALL ON FUNCTION public.claim_offer_previews() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offer_previews() TO service_role;
COMMENT ON TABLE public.extension_preview_assets IS 'Admin extension JPEG thumbnails by archive ID. Independent triggers only attach covers, never update offers or mining; failures preserve previous valid covers.';
COMMENT ON FUNCTION public.claim_offer_previews() IS 'Server Meta copying disabled; empty claims never spend attempts. Covers arrive via extension.';