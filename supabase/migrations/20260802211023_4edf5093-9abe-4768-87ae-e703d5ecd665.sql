-- 1) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated/public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prokind = 'f'
      AND p.proname <> 'handle_new_user'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', r.sig);
  END LOOP;
END $$;

-- handle_new_user is a trigger function on auth.users; keep it locked down too
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) platform_settings: remove anonymous read access
DROP POLICY IF EXISTS "public read platform settings" ON public.platform_settings;
REVOKE ALL ON TABLE public.platform_settings FROM anon;