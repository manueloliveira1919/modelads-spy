
-- meta_offers: explicit service-role-only write policies (make write access intentional)
CREATE POLICY "Service role can insert offers"
  ON public.meta_offers FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update offers"
  ON public.meta_offers FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete offers"
  ON public.meta_offers FOR DELETE
  TO service_role
  USING (true);

-- meta_refresh_runs: remove authenticated read; keep it service-role-only
DROP POLICY IF EXISTS "Authenticated can read runs" ON public.meta_refresh_runs;

CREATE POLICY "Service role can read runs"
  ON public.meta_refresh_runs FOR SELECT
  TO service_role
  USING (true);
