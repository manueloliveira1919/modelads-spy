import { createFileRoute } from "@tanstack/react-router";
import {
  classifyStatus,
  extractPrice,
  inferProductType,
  inferStructure,
  stripSnapshotSecrets,
} from "@/lib/offer-heuristics";
import {
  ADS_PER_CLASSIFY_JOB,
  ADS_PER_SNAPSHOT_JOB,
  computeActiveDays,
  computeQualityScore,
  extractSnapshotMedia,
  normalizeAdLanguage,
  runInBatches,
  searchTermPaginated,
  type MetaAdItem,
} from "@/lib/meta-mining.server";

// Worker de jobs — chamado pelo pg_cron a cada ~1 minuto (e também pode
// ser chamado manualmente). Cada chamada reivindica alguns jobs pendentes
// (via a função `claim_refresh_jobs`, que usa FOR UPDATE SKIP LOCKED —
// dois workers nunca pegam o mesmo job) e processa só esses. Isso garante
// que cada chamada termina em poucos segundos, bem dentro do limite de
// CPU do Worker — diferente do endpoint antigo, que tentava fazer tudo
// numa request só e por isso "morria" no meio de runs grandes.

const JOBS_PER_TICK = 3;

interface MetaRefreshJob {
  id: string;
  run_id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
}

async function jobLog(
  supabaseAdmin: any,
  runId: string,
  kind: string,
  summary: string,
  details: Record<string, unknown>,
) {
  try {
    await supabaseAdmin.from("mining_logs").insert({
      kind: "job",
      status: "ok",
      summary,
      details: { run_id: runId, job_kind: kind, ...details } as never,
    });
  } catch {
    /* nunca quebrar o worker por causa de log */
  }
}

async function markJobDone(supabaseAdmin: any, jobId: string, error: string | null) {
  await supabaseAdmin
    .from("meta_refresh_jobs")
    .update({ status: error ? "failed" : "done", finished_at: new Date().toISOString(), error })
    .eq("id", jobId);
}

async function remainingCount(
  supabaseAdmin: any,
  runId: string,
  kind: string,
): Promise<number> {
  const { count } = await supabaseAdmin
    .from("meta_refresh_jobs")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .eq("kind", kind)
    .in("status", ["pending", "running"]);
  return count ?? 0;
}

// ---------- Processa 1 job de busca na Meta ----------
async function processSearchJob(supabaseAdmin: any, job: MetaRefreshJob) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não configurado");

  const settings = job.payload.settings as { per_keyword_limit: number; max_pages: number };
  const steps = job.payload.steps as {
    term: string;
    category: string | null;
    language: string;
    country: string;
  }[];

  const errors: string[] = [];
  const rows: Record<string, unknown>[] = [];

  for (const step of steps) {
    try {
      const items = await searchTermPaginated({
        token,
        term: step.term,
        country: step.country,
        limit: settings.per_keyword_limit,
        maxPages: settings.max_pages,
      });
      for (const ad of items as MetaAdItem[]) {
        if (!ad.id || !ad.page_id) continue;
        rows.push({
          run_id: job.run_id,
          ad_archive_id: ad.id,
          page_id: ad.page_id,
          page_name: ad.page_name ?? "Página desconhecida",
          term: step.term,
          category: step.category,
          language_hint: step.language,
          ad_snapshot_url: stripSnapshotSecrets(ad.ad_snapshot_url),
          raw: ad as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      errors.push(`${step.category ?? "—"}/${step.term}: ${(err as Error).message}`);
    }
  }

  if (rows.length) {
    // ignoreDuplicates: se dois jobs acharem o mesmo ad_archive_id (termos
    // que se sobrepõem), o segundo é descartado no próprio banco — dedupe
    // robusto mesmo com vários jobs rodando em paralelo.
    const { error } = await supabaseAdmin
      .from("meta_refresh_ads_raw")
      .upsert(rows as never, { onConflict: "run_id,ad_archive_id", ignoreDuplicates: true });
    if (error) errors.push(`upsert raw: ${error.message}`);
  }

  await jobLog(supabaseAdmin, job.run_id, "meta.search", `busca: ${steps.length} termos, ${rows.length} anúncios`, {
    terms: steps.length,
    ads_found: rows.length,
    errors,
  });

  return errors.length ? errors.join(" | ") : null;
}

// ---------- Processa 1 job de extração de snapshot ----------
async function processSnapshotJob(supabaseAdmin: any, job: MetaRefreshJob) {
  const pairs = job.payload.items as { ad_archive_id: string; snapshot_url: string | null }[];

  const results = await runInBatches(pairs, 8, async (pair) => {
    const outcome = await extractSnapshotMedia(pair.snapshot_url);
    return { pair, outcome };
  });

  const rows = results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map(({ pair, outcome }) => ({
      run_id: job.run_id,
      ad_archive_id: pair.ad_archive_id,
      image_url: outcome.media.imageUrl,
      video_url: outcome.media.videoUrl,
      link_url: outcome.media.linkUrl,
      snapshot_url: pair.snapshot_url,
      attempts: outcome.attempts,
      error: outcome.error,
    }));

  let dbError: string | null = null;
  if (rows.length) {
    const { error } = await supabaseAdmin
      .from("meta_refresh_snapshots")
      .upsert(rows as never, { onConflict: "run_id,ad_archive_id", ignoreDuplicates: true });
    if (error) dbError = `upsert snapshots: ${error.message}`;
  }

  const snapErrors = rows.filter((r) => r.error).length;
  await jobLog(supabaseAdmin, job.run_id, "snapshot.extract", `snapshots: ${rows.length} processados, ${snapErrors} falharam`, {
    total: rows.length,
    failed: snapErrors,
  });

  return dbError;
}

// ---------- Processa 1 job de classificação + upsert final ----------
async function processClassifyJob(supabaseAdmin: any, job: MetaRefreshJob) {
  const { loadActiveBlacklist, loadActiveCategories, loadMiningSettings, buildBlacklistMatcher } =
    await import("@/lib/mining-config.server");

  const adIds = job.payload.ad_archive_ids as string[];

  const [rawRes, snapRes, blacklist, activeCategories, settings] = await Promise.all([
    supabaseAdmin.from("meta_refresh_ads_raw").select("*").eq("run_id", job.run_id).in("ad_archive_id", adIds),
    supabaseAdmin.from("meta_refresh_snapshots").select("*").eq("run_id", job.run_id).in("ad_archive_id", adIds),
    loadActiveBlacklist(),
    loadActiveCategories(),
    loadMiningSettings(),
  ]);

  if (rawRes.error) throw new Error(`ler raw: ${rawRes.error.message}`);

  const matchBlacklist = buildBlacklistMatcher(blacklist);
  const allowedLangs = new Set((settings.languages ?? []).map((l: string) => l.toUpperCase()));

  const snapshotByAd = new Map<string, any>();
  for (const s of snapRes.data ?? []) snapshotByAd.set(s.ad_archive_id, s);

  // Contagem de anúncios por página nesta run inteira — usada como proxy
  // de "quão em escala" a página está (mesmo critério do código original).
  const { data: pageRows } = await supabaseAdmin
    .from("meta_refresh_ads_raw")
    .select("page_id")
    .eq("run_id", job.run_id);
  const pageCounts = new Map<string, number>();
  for (const r of pageRows ?? []) pageCounts.set(r.page_id, (pageCounts.get(r.page_id) ?? 0) + 1);

  const compositeSeen = new Set<string>();
  const rowsToUpsert: Record<string, unknown>[] = [];
  const skipped = { blacklist: 0, language: 0, category: 0, duplicate: 0, noLanding: 0 };

  for (const raw of rawRes.data ?? []) {
    try {
      const ad = raw.raw as MetaAdItem;
      const snapshot = snapshotByAd.get(raw.ad_archive_id);
      const media = {
        imageUrl: snapshot?.image_url ?? null,
        videoUrl: snapshot?.video_url ?? null,
        linkUrl: snapshot?.link_url ?? null,
      };

      const bodyText = ad.ad_creative_bodies?.[0] ?? "";
      const title = ad.ad_creative_link_titles?.[0] ?? "";
      const desc = ad.ad_creative_link_descriptions?.[0] ?? "";
      const fullText = `${raw.page_name} ${title} ${bodyText} ${desc}`;

      const hit = matchBlacklist({ text: fullText, pageName: raw.page_name, link: media.linkUrl });
      if (hit) {
        skipped.blacklist++;
        continue;
      }

      const language = normalizeAdLanguage(ad.languages, raw.language_hint);
      if (allowedLangs.size && !allowedLangs.has(language) && !allowedLangs.has("BR")) {
        if (!(allowedLangs.has("BR") && language === "PT")) {
          skipped.language++;
          continue;
        }
      }

      const finalCategory = raw.category && activeCategories.has(raw.category) ? raw.category : null;
      if (!finalCategory) {
        skipped.category++;
        continue;
      }

      const headline = title || bodyText.slice(0, 120);
      const compositeKey = `${raw.page_id}|${headline.slice(0, 100)}|${media.linkUrl ?? ""}`;
      if (compositeSeen.has(compositeKey)) {
        skipped.duplicate++;
        continue;
      }
      compositeSeen.add(compositeKey);

      const structure = inferStructure(`${title} ${bodyText}`);
      const activeDays = computeActiveDays(ad.ad_delivery_start_time);
      const creativeUrl = media.videoUrl ?? media.imageUrl ?? null;
      const creativeType: "image" | "video" = media.videoUrl ? "video" : "image";
      const hasPrice = extractPrice(`${title} ${bodyText} ${desc}`) !== null;
      const hasLanding = !!media.linkUrl;
      const hasCreative = !!creativeUrl;
      const activeAdsCount = pageCounts.get(raw.page_id) ?? 1;

      if (!hasLanding && !hasCreative) {
        skipped.noLanding++;
        continue;
      }

      const qualityScore = computeQualityScore({
        languageOk:
          allowedLangs.size === 0 || allowedLangs.has(language) || (allowedLangs.has("BR") && language === "PT"),
        categoryOk: true,
        hasPrice,
        hasLanding,
        activeAds: activeAdsCount,
        activeDays,
        hasCreative,
      });

      rowsToUpsert.push({
        ad_archive_id: raw.ad_archive_id,
        page_id: raw.page_id,
        page_name: raw.page_name,
        category: finalCategory,
        language,
        country: "BR",
        headline,
        description: bodyText || desc,
        creative_url: creativeUrl,
        creative_type: creativeType,
        ad_snapshot_url: raw.ad_snapshot_url,
        page_url: `https://www.facebook.com/${raw.page_id}`,
        link_url: media.linkUrl,
        ad_start_date: ad.ad_delivery_start_time ?? null,
        is_active: true,
        active_days: activeDays,
        active_ads_count: activeAdsCount,
        status: classifyStatus(activeAdsCount),
        structure,
        product_type: inferProductType(`${title} ${bodyText} ${desc}`),
        search_term: raw.term,
        quality_score: qualityScore,
        last_seen: new Date().toISOString(),
      });
    } catch {
      // uma linha ruim não derruba o job inteiro
    }
  }

  let upserts = 0;
  let dbError: string | null = null;
  if (rowsToUpsert.length) {
    const { error } = await supabaseAdmin
      .from("meta_offers")
      .upsert(rowsToUpsert as never, { onConflict: "ad_archive_id" });
    if (error) dbError = `upsert meta_offers: ${error.message}`;
    else upserts = rowsToUpsert.length;
  }

  await jobLog(supabaseAdmin, job.run_id, "classify.upsert", `classificados: ${upserts} gravados de ${adIds.length}`, {
    processed: adIds.length,
    upserts,
    ...skipped,
  });

  return dbError;
}

// ---------- Finaliza a run: deactivate + métricas + fecha o registro ----------
async function processFinalizeJob(supabaseAdmin: any, job: MetaRefreshJob) {
  const { data: run } = await supabaseAdmin
    .from("meta_refresh_runs")
    .select("started_at")
    .eq("id", job.run_id)
    .single();
  const startedAt = run?.started_at ?? new Date().toISOString();

  const { count: deactivated } = await supabaseAdmin
    .from("meta_offers")
    .update({ is_active: false }, { count: "exact" })
    .eq("is_active", true)
    .lt("last_seen", startedAt);

  const { count: pagesSeen } = await supabaseAdmin
    .from("meta_refresh_ads_raw")
    .select("page_id", { count: "exact", head: true })
    .eq("run_id", job.run_id);

  // Agrega os logs de cada job dessa run pra montar os totais finais.
  const { data: jobLogs } = await supabaseAdmin
    .from("mining_logs")
    .select("details")
    .eq("kind", "job")
    .filter("details->>run_id", "eq", job.run_id);

  let upserts = 0;
  let searchErrors = 0;
  for (const l of jobLogs ?? []) {
    const d = l.details as Record<string, unknown>;
    if (typeof d.upserts === "number") upserts += d.upserts;
    if (Array.isArray(d.errors)) searchErrors += d.errors.length;
  }

  const status = searchErrors > 0 ? "partial" : upserts > 0 ? "success" : "blocked";
  const finishedAt = new Date().toISOString();

  await supabaseAdmin
    .from("meta_refresh_runs")
    .update({
      finished_at: finishedAt,
      status,
      offers_upserted: upserts,
      pages_seen: pagesSeen ?? 0,
      phase: "done",
      error: searchErrors > 0 ? `${searchErrors} erro(s) durante a coleta — ver mining_logs` : null,
      details: {
        deactivated: deactivated ?? 0,
        search_errors: searchErrors,
      } as never,
    })
    .eq("id", job.run_id);

  await supabaseAdmin.from("mining_logs").insert({
    kind: "run",
    status,
    summary: `run finalizada: ${upserts} ofertas, ${pagesSeen ?? 0} páginas, ${deactivated ?? 0} desativadas`,
    details: {
      run_id: job.run_id,
      started_at: startedAt,
      finished_at: finishedAt,
      upserts,
      pages_seen: pagesSeen ?? 0,
      deactivated: deactivated ?? 0,
      search_errors: searchErrors,
    } as never,
  });

  // Limpeza — não precisamos mais guardar o estado intermediário dessa run.
  await supabaseAdmin.from("meta_refresh_ads_raw").delete().eq("run_id", job.run_id);
  await supabaseAdmin.from("meta_refresh_snapshots").delete().eq("run_id", job.run_id);

  return null;
}

// ---------- Depois de um job terminar, decide se avança de fase ----------
async function maybeAdvancePhase(supabaseAdmin: any, job: MetaRefreshJob) {
  if (job.kind === "meta.search") {
    if ((await remainingCount(supabaseAdmin, job.run_id, "meta.search")) > 0) return;
    const advanced = await supabaseAdmin.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "search",
      p_to_phase: "snapshot",
    });
    if (!advanced.data) return; // outro worker já fez essa transição

    const { data: rawRows } = await supabaseAdmin
      .from("meta_refresh_ads_raw")
      .select("ad_archive_id, ad_snapshot_url")
      .eq("run_id", job.run_id);
    const items = rawRows ?? [];
    const jobs = [];
    for (let i = 0; i < items.length; i += ADS_PER_SNAPSHOT_JOB) {
      jobs.push({
        run_id: job.run_id,
        kind: "snapshot.extract",
        payload: {
          items: items.slice(i, i + ADS_PER_SNAPSHOT_JOB).map((r: any) => ({
            ad_archive_id: r.ad_archive_id,
            snapshot_url: r.ad_snapshot_url,
          })),
        },
      });
    }
    if (jobs.length) await supabaseAdmin.from("meta_refresh_jobs").insert(jobs as never);
    else {
      // nada pra extrair (nenhum snapshot url) — pula direto pra classify
      await supabaseAdmin.rpc("try_advance_run_phase", {
        p_run_id: job.run_id,
        p_from_phase: "snapshot",
        p_to_phase: "classify",
      });
    }
  }

  if (job.kind === "snapshot.extract") {
    if ((await remainingCount(supabaseAdmin, job.run_id, "snapshot.extract")) > 0) return;
    const advanced = await supabaseAdmin.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "snapshot",
      p_to_phase: "classify",
    });
    if (!advanced.data) return;

    const { data: rawRows } = await supabaseAdmin
      .from("meta_refresh_ads_raw")
      .select("ad_archive_id")
      .eq("run_id", job.run_id);
    const ids = (rawRows ?? []).map((r: any) => r.ad_archive_id);
    const jobs = [];
    for (let i = 0; i < ids.length; i += ADS_PER_CLASSIFY_JOB) {
      jobs.push({
        run_id: job.run_id,
        kind: "classify.upsert",
        payload: { ad_archive_ids: ids.slice(i, i + ADS_PER_CLASSIFY_JOB) },
      });
    }
    if (jobs.length) await supabaseAdmin.from("meta_refresh_jobs").insert(jobs as never);
  }

  if (job.kind === "classify.upsert") {
    if ((await remainingCount(supabaseAdmin, job.run_id, "classify.upsert")) > 0) return;
    const advanced = await supabaseAdmin.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "classify",
      p_to_phase: "finalize",
    });
    if (!advanced.data) return;
    await supabaseAdmin.from("meta_refresh_jobs").insert([
      { run_id: job.run_id, kind: "run.finalize", payload: {} },
    ] as never);
  }
}

async function authorize(
  request: Request,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) return { ok: true };
  const apiKey = request.headers.get("apikey");
  if (serviceKey && apiKey && apiKey === serviceKey) return { ok: true };
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer && serviceKey && bearer === serviceKey) return { ok: true };
  return { ok: false, reason: "missing_credentials" };
}

export const Route = createFileRoute("/api/public/hooks/refresh-worker")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, endpoint: "refresh-worker" }),
      POST: async ({ request }) => {
        const auth = await authorize(request);
        if (!auth.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "unauthorized", reason: auth.reason }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: jobs, error: claimErr } = await supabaseAdmin.rpc("claim_refresh_jobs", {
          p_limit: JOBS_PER_TICK,
        });
        if (claimErr) {
          return new Response(JSON.stringify({ ok: false, error: claimErr.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const claimed = (jobs ?? []) as MetaRefreshJob[];
        if (claimed.length === 0) {
          return Response.json({ ok: true, processed: 0, note: "nenhum job pendente" });
        }

        const results = [];
        for (const job of claimed) {
          let error: string | null = null;
          try {
            if (job.kind === "meta.search") error = await processSearchJob(supabaseAdmin, job);
            else if (job.kind === "snapshot.extract") error = await processSnapshotJob(supabaseAdmin, job);
            else if (job.kind === "classify.upsert") error = await processClassifyJob(supabaseAdmin, job);
            else if (job.kind === "run.finalize") error = await processFinalizeJob(supabaseAdmin, job);
            else error = `kind desconhecido: ${job.kind}`;
          } catch (err) {
            error = (err as Error).message;
          }
          await markJobDone(supabaseAdmin, job.id, error);
          if (!error) {
            try {
              await maybeAdvancePhase(supabaseAdmin, job);
            } catch (err) {
              await jobLog(supabaseAdmin, job.run_id, job.kind, "erro ao avançar fase", {
                error: (err as Error).message,
              });
            }
          }
          results.push({ id: job.id, kind: job.kind, error });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
