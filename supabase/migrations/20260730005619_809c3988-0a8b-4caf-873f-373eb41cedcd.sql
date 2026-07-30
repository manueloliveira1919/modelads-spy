-- Explicit service_role-only access for internal mining tables
GRANT ALL ON public.meta_refresh_ads_raw TO service_role;
GRANT ALL ON public.meta_refresh_jobs TO service_role;
GRANT ALL ON public.meta_refresh_snapshots TO service_role;

REVOKE ALL ON public.meta_refresh_ads_raw FROM anon, authenticated;
REVOKE ALL ON public.meta_refresh_jobs FROM anon, authenticated;
REVOKE ALL ON public.meta_refresh_snapshots FROM anon, authenticated;

ALTER TABLE public.meta_refresh_ads_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_refresh_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages ads raw" ON public.meta_refresh_ads_raw;
CREATE POLICY "service role manages ads raw" ON public.meta_refresh_ads_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages refresh jobs" ON public.meta_refresh_jobs;
CREATE POLICY "service role manages refresh jobs" ON public.meta_refresh_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service role manages snapshots" ON public.meta_refresh_snapshots;
CREATE POLICY "service role manages snapshots" ON public.meta_refresh_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SECURITY DEFINER queue functions must not be callable from the Data API
REVOKE ALL ON FUNCTION public.claim_refresh_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_advance_run_phase(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_refresh_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_advance_run_phase(uuid, text, text) TO service_role;