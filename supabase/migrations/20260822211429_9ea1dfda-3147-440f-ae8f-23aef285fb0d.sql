REVOKE EXECUTE ON FUNCTION public.offers_quality_snapshot(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.offers_quality_snapshot(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.offers_quality_snapshot(uuid[]) TO service_role;