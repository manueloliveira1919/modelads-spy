CREATE OR REPLACE FUNCTION public.reconcile_extension_previews(p_offer_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_view_offers() OR public.is_user_suspended(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF cardinality(p_offer_ids)>250 THEN RAISE EXCEPTION 'Too many offers'; END IF;
 INSERT INTO public.offer_previews(offer_id,url,status,source_ad_id,last_error,updated_at)
 SELECT DISTINCT ON (m.offer_id) m.offer_id,a.url,'ok',a.ad_archive_id,NULL,a.updated_at
 FROM public.extension_preview_assets a JOIN public.meta_offers m ON m.ad_archive_id=a.ad_archive_id
 JOIN public.offers o ON o.id=m.offer_id
 WHERE m.offer_id=ANY(p_offer_ids) AND a.status='ok' AND o.visible AND o.qualified
 ORDER BY m.offer_id,a.updated_at DESC,a.ad_archive_id
 ON CONFLICT(offer_id) DO UPDATE SET url=EXCLUDED.url,status='ok',source_ad_id=EXCLUDED.source_ad_id,
 last_error=NULL,claim_token=NULL,claimed_at=NULL,updated_at=EXCLUDED.updated_at
 WHERE public.offer_previews.status <> 'ok' OR public.offer_previews.updated_at < EXCLUDED.updated_at;
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_extension_previews(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_extension_previews(uuid[]) TO authenticated,service_role;
COMMENT ON FUNCTION public.reconcile_extension_previews(uuid[]) IS 'Bounded paid-user reconciliation of independently uploaded covers only. Repairs concurrent upload/ad-link commit races, never touches offers or mining.';