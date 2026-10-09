REVOKE EXECUTE ON FUNCTION public.extension_access_check(uuid) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.extension_access_check(uuid) TO service_role;