GRANT EXECUTE ON FUNCTION public.list_active_offer_pages() TO public;
GRANT EXECUTE ON FUNCTION public.list_active_offer_pages() TO anon;
GRANT EXECUTE ON FUNCTION public.list_active_offer_pages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mining_run_progress(uuid) TO authenticated;