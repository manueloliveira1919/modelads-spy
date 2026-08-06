REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON FUNCTION public.mining_timeout_run(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_partial_finalize(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_requeue_job(uuid, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_ensure_classify_jobs(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_create_run(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_enqueue_jobs(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_upsert_raw(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_upsert_offers(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_upsert_snapshots(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_deactivate_stale(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_count_pages_seen(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_cleanup_run(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_job_update_status(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_log(text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_sum_job_logs(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_update_run(uuid, text, timestamp with time zone, text, text, integer, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_remaining_count(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_run_started_at(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_advance_run_phase(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_refresh_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_page_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_raw_for_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_raw_ids(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_raw_rows(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_get_snapshot_rows(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mining_is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- Functions intended for authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mining_run_progress(uuid) TO authenticated;