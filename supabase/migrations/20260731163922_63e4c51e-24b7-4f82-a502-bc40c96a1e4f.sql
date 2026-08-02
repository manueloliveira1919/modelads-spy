GRANT SELECT ON public.platform_settings TO authenticated;

DROP POLICY IF EXISTS "public read platform settings" ON public.platform_settings;
CREATE POLICY "public read platform settings"
  ON public.platform_settings FOR SELECT TO anon USING (true);

CREATE POLICY "authenticated read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);