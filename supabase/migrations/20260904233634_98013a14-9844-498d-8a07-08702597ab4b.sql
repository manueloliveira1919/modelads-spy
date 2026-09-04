-- 1) SECURITY DEFINER functions must not be callable by anon/authenticated
REVOKE ALL ON FUNCTION public.mining_deactivate_stale(timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mining_deactivate_stale(timestamptz, text) TO service_role;

REVOKE ALL ON FUNCTION public.mining_deactivate_stale(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mining_deactivate_stale(timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.offers_quality_snapshot(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.offers_quality_snapshot(uuid[]) TO service_role;

-- 2) offers table: no direct public/anon reads; only admins (showcase uses SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "offers públicas mostram só o visível" ON public.offers;
CREATE POLICY "Admins can read offers"
ON public.offers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.offers FROM anon;
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;