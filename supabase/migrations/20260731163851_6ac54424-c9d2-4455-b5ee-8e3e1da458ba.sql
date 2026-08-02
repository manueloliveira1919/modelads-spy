REVOKE SELECT ON public.platform_settings FROM anon, authenticated;

GRANT SELECT (id, platform_name, logo_url, domain, version, status, singleton, created_at, updated_at)
  ON public.platform_settings TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
REVOKE SELECT ON public.platform_settings FROM authenticated;
GRANT SELECT (id, platform_name, logo_url, domain, version, status, singleton, created_at, updated_at)
  ON public.platform_settings TO authenticated;

GRANT ALL ON public.platform_settings TO service_role;