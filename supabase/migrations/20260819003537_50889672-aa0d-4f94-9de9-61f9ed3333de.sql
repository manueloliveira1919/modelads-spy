REVOKE ALL ON FUNCTION public.offers_attach_ads(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offers_recompute(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offers_attach_ads(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.offers_recompute(uuid[]) TO service_role;