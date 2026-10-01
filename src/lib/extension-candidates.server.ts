// Injects pending extension candidates into the existing mining pipeline as a
// partial run that starts directly at the classify phase.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const MAX_CANDIDATES_PER_PROCESS = 200;
const ADS_PER_CLASSIFY_JOB = 50;

function fallbackPageId(name: string | null): string {
  let h = 0;
  for (const c of name ?? "desconhecida") h = (h * 31 + c.charCodeAt(0)) | 0;
  return `ext_${Math.abs(h)}`;
}

export async function processPendingCandidates(supabaseAdmin: any) {
  const { data: pending, error } = await supabaseAdmin
    .from("extension_candidates")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })
    .limit(MAX_CANDIDATES_PER_PROCESS);
  if (error) throw new Error(error.message);
  if (!pending?.length) return { processed: 0, run_id: null as string | null };

  const now = new Date().toISOString();
  const { data: runId, error: runErr } = await supabaseAdmin.rpc("mining_create_run", {
    p_started_at: now,
  });
  if (runErr || !runId) throw new Error(runErr?.message ?? "não foi possível criar a run");

  // Partial coverage: finalize never deactivates the catalog for this run.
  await supabaseAdmin
    .from("meta_refresh_runs")
    .update({ phase: "classify", details: { coverage: "partial", source: "extension", candidates: pending.length } })
    .eq("id", runId);

  const raw = pending.map((c: any) => {
    const pageId = c.page_id || fallbackPageId(c.page_name);
    const start =
      c.active_days != null
        ? new Date(Date.now() - c.active_days * 86_400_000).toISOString()
        : undefined;
    return {
      run_id: runId,
      ad_archive_id: c.ad_archive_id,
      page_id: pageId,
      page_name: c.page_name ?? "Página desconhecida",
      term: c.keyword_used,
      category: null,
      language_hint: "PT",
      ad_snapshot_url: null,
      raw: {
        id: c.ad_archive_id,
        page_id: pageId,
        page_name: c.page_name,
        ad_creative_bodies: c.creative_text ? [c.creative_text] : [],
        ad_creative_link_captions: c.link_url ? [c.link_url] : [],
        ad_delivery_start_time: start,
      },
    };
  });
  const { error: rawErr } = await supabaseAdmin.rpc("mining_upsert_raw", { p_rows: raw });
  if (rawErr) throw new Error(rawErr.message);

  const snaps = pending
    .filter((c: any) => c.media_url || c.link_url)
    .map((c: any) => {
      const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(c.media_url ?? "");
      return {
        run_id: runId,
        ad_archive_id: c.ad_archive_id,
        image_url: isVideo ? null : c.media_url,
        video_url: isVideo ? c.media_url : null,
        link_url: c.link_url,
        snapshot_url: null,
      };
    });
  if (snaps.length) await supabaseAdmin.rpc("mining_upsert_snapshots", { p_rows: snaps });

  const ids = pending.map((c: any) => c.ad_archive_id);
  const jobs = [];
  for (let i = 0; i < ids.length; i += ADS_PER_CLASSIFY_JOB) {
    jobs.push({ run_id: runId, kind: "classify.upsert", payload: { ad_archive_ids: ids.slice(i, i + ADS_PER_CLASSIFY_JOB) } });
  }
  const { error: jobErr } = await supabaseAdmin.rpc("mining_enqueue_jobs", { p_jobs: jobs });
  if (jobErr) throw new Error(jobErr.message);

  await supabaseAdmin
    .from("extension_candidates")
    .update({ status: "processed", run_id: runId, processed_at: now })
    .in("id", pending.map((c: any) => c.id));

  await supabaseAdmin.rpc("mining_log", {
    p_kind: "run",
    p_status: "running",
    p_summary: `extensão: ${pending.length} candidatos enviados para classificação`,
    p_details: { run_id: runId, source: "extension" },
  });

  return { processed: pending.length, run_id: runId as string };
}
