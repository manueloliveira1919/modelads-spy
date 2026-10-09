// Injects pending extension candidates into the existing mining pipeline as a
// partial run that starts directly at the classify phase.
// Candidates are atomically claimed first, so concurrent admin clicks never
// process the same rows; failures release the claim for a safe retry.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const MAX_CANDIDATES_PER_PROCESS = 200;
const ADS_PER_CLASSIFY_JOB = 50;

function fallbackPageId(name: string | null): string {
  let h = 0;
  for (const c of name ?? "desconhecida") h = (h * 31 + c.charCodeAt(0)) | 0;
  return `ext_${Math.abs(h)}`;
}

export async function processPendingCandidates(supabaseAdmin: any) {
  const { data: claimRows, error: claimErr } = await supabaseAdmin.rpc("extension_claim_candidates", {
    p_limit: MAX_CANDIDATES_PER_PROCESS,
  });
  if (claimErr) throw new Error(claimErr.message);
  const claim = (claimRows ?? [])[0] as { claim_token: string; recovered: number; ids: string[] } | undefined;
  if (!claim?.ids?.length) return { processed: 0, recovered: claim?.recovered ?? 0, run_id: null as string | null };
  const token = claim.claim_token;

  let runId: string | null = null;
  try {
    const { data: pending, error } = await supabaseAdmin
      .from("extension_candidates")
      .select("*")
      .eq("claim_token", token);
    if (error) throw new Error(error.message);
    if (!pending?.length) return { processed: 0, recovered: claim.recovered, run_id: null };

    const now = new Date().toISOString();
    const { data: newRun, error: runErr } = await supabaseAdmin.rpc("mining_create_run", { p_started_at: now });
    if (runErr || !newRun) throw new Error(runErr?.message ?? "não foi possível criar a run");
    runId = newRun as string;

    // Partial coverage: finalize never deactivates the catalog for this run.
    await supabaseAdmin
      .from("meta_refresh_runs")
      .update({ phase: "classify", details: { coverage: "partial", source: "extension", candidates: pending.length } })
      .eq("id", runId);

    const raw = pending.map((c: any) => {
      const pageId = c.page_id || fallbackPageId(c.page_name);
      const start =
        c.active_days != null ? new Date(Date.now() - c.active_days * 86_400_000).toISOString() : undefined;
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

    // Media is optional evidence: a failure here is logged per candidate but
    // never blocks classification of the ad.
    const withMedia = pending.filter((c: any) => c.media_url || c.link_url);
    const snaps = withMedia.map((c: any) => {
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
    let mediaError: string | null = null;
    if (snaps.length) {
      const { error: snapErr } = await supabaseAdmin.rpc("mining_upsert_snapshots", { p_rows: snaps });
      if (snapErr) {
        mediaError = String(snapErr.message).slice(0, 300);
        await supabaseAdmin
          .from("extension_candidates")
          .update({ media_error: mediaError })
          .in("id", withMedia.map((c: any) => c.id));
        await supabaseAdmin.rpc("mining_log", {
          p_kind: "run",
          p_status: "warning",
          p_summary: `extensão: falha ao registrar mídia de ${snaps.length} candidatos (seguem para classificação)`,
          p_details: { run_id: runId, source: "extension", error: mediaError, ad_archive_ids: withMedia.map((c: any) => c.ad_archive_id).slice(0, 50) },
        });
      }
    }

    const ids = pending.map((c: any) => c.ad_archive_id);
    const jobs = [];
    for (let i = 0; i < ids.length; i += ADS_PER_CLASSIFY_JOB) {
      jobs.push({ run_id: runId, kind: "classify.upsert", payload: { ad_archive_ids: ids.slice(i, i + ADS_PER_CLASSIFY_JOB) } });
    }
    const { error: jobErr } = await supabaseAdmin.rpc("mining_enqueue_jobs", { p_jobs: jobs });
    if (jobErr) throw new Error(jobErr.message);

    const { data: done } = await supabaseAdmin.rpc("extension_complete_claim", {
      p_claim_token: token,
      p_run_id: runId,
    });

    await supabaseAdmin.rpc("mining_log", {
      p_kind: "run",
      p_status: "running",
      p_summary: `extensão: ${pending.length} candidatos enviados para classificação`,
      p_details: { run_id: runId, source: "extension", recovered: claim.recovered, media_error: mediaError },
    });

    return { processed: (done as number) ?? pending.length, recovered: claim.recovered, run_id: runId };
  } catch (e) {
    const msg = (e as Error).message ?? "erro";
    // Release claim: back to pending (or failed after max attempts). Nothing in offers was touched.
    await supabaseAdmin.rpc("extension_release_claim", { p_claim_token: token, p_error: msg });
    if (runId) {
      await supabaseAdmin
        .from("meta_refresh_runs")
        .update({ status: "failed", phase: "done", finished_at: new Date().toISOString(), error: `extensão: ${msg}`.slice(0, 500) })
        .eq("id", runId)
        .eq("status", "running");
      await supabaseAdmin.from("meta_refresh_jobs").update({ status: "failed", error: "run da extensão falhou" }).eq("run_id", runId).eq("status", "pending");
    }
    await supabaseAdmin.rpc("mining_log", {
      p_kind: "run",
      p_status: "failed",
      p_summary: "extensão: processamento falhou, candidatos devolvidos à fila",
      p_details: { run_id: runId, source: "extension", error: msg.slice(0, 300) },
    });
    throw e;
  }
}
