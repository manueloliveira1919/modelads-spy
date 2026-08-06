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
  MetaApiError,
  normalizeAdLanguage,
  runInBatches,
  searchTermPaginated,
  serverSupabaseAnon,
  sleep,
  type MetaAdItem,
} from "@/lib/meta-mining.server";

// Worker de jobs — chamado pelo pg_cron a cada minuto. A fila e as RPCs
// internas são acessadas pelo cliente privilegiado exclusivamente no servidor.

// Número de jobs processados por tick. Mantemos 2 em paralelo para dar
// progresso, mas a taxa real é controlada por available_at (backoff de rate limit)
// e por delay entre chamadas à Meta.
const JOBS_PER_TICK = 2;
// Backoff aplicado quando a Meta retorna (#613) rate limit.
// A Meta geralmente reseta a janela a cada hora, então esperamos 60 min.
const RATE_LIMIT_BACKOFF_MS = 60 * 60 * 1000;


interface MetaRefreshJob {
  id: string;
  run_id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
}

async function jobLog(
  supabase: any,
  runId: string,
  kind: string,
  summary: string,
  details: Record<string, unknown>,
) {
  try {
    await supabase.rpc("mining_log", {
      p_kind: "job",
      p_status: "ok",
      p_summary: summary,
      p_details: { run_id: runId, job_kind: kind, ...details },
    });
  } catch {
    /* nunca quebrar o worker por causa de log */
  }
}

async function markJobDone(supabase: any, jobId: string, error: string | null) {
  await supabase.rpc("mining_job_update_status", {
    p_job_id: jobId,
    p_status: error ? "failed" : "done",
    p_error: error,
  });
}

async function requeueJob(supabase: any, jobId: string, delayMs: number) {
  const availableAt = new Date(Date.now() + delayMs).toISOString();
  await supabase.rpc("mining_requeue_job", {
    p_job_id: jobId,
    p_available_at: availableAt,
  });
}

async function remainingCount(supabase: any, runId: string, kind: string): Promise<number> {
  const { data } = await supabase.rpc("mining_remaining_count", { p_run_id: runId, p_kind: kind });
  return data ?? 0;
}

// ---------- Processa 1 job de busca na Meta ----------
async function processSearchJob(supabase: any, job: MetaRefreshJob) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não configurado");

  const settings = job.payload.settings as {
    per_keyword_limit: number;
    max_pages: number;
    meta_api_delay_ms?: number;
  };
  const delayMs = settings.meta_api_delay_ms ?? 2000;
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
        delayMs,
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
          // Tabela interna (service role): guardamos a URL completa porque o token
          // é obrigatório para abrir o snapshot. A versão sem token é gravada
          // depois em meta_offers, que é a tabela exposta ao client.
          ad_snapshot_url: ad.ad_snapshot_url ?? null,
          raw: ad,
        });
      }
    } catch (err) {
      const message = (err as Error).message;
      errors.push(`${step.category ?? "—"}/${step.term}: ${message}`);
      if (err instanceof MetaApiError && err.isRateLimit) {
        // Propaga sinal especial para o loop principal re-enfileirar com backoff.
        throw new RateLimitError(message, rows.length);
      }
    }
  }

  if (rows.length) {
    const { error } = await supabase.rpc("mining_upsert_raw", { p_rows: rows });
    if (error) errors.push(`upsert raw: ${error.message}`);
  }

  await jobLog(supabase, job.run_id, "meta.search", `busca: ${steps.length} termos, ${rows.length} anúncios`, {
    terms: steps.length,
    ads_found: rows.length,
    errors,
  });

  return errors.length ? errors.join(" | ") : null;
}

class RateLimitError extends Error {
  collectedAds: number;
  constructor(message: string, collectedAds: number) {
    super(message);
    this.collectedAds = collectedAds;
    this.name = "RateLimitError";
  }
}

// ---------- Processa 1 job de extração de snapshot ----------
async function processSnapshotJob(supabase: any, job: MetaRefreshJob) {
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
    const { error } = await supabase.rpc("mining_upsert_snapshots", { p_rows: rows });
    if (error) dbError = `upsert snapshots: ${error.message}`;
  }

  const snapErrors = rows.filter((r) => r.error).length;
  await jobLog(supabase, job.run_id, "snapshot.extract", `snapshots: ${rows.length} processados, ${snapErrors} falharam`, {
    total: rows.length,
    failed: snapErrors,
  });

  return dbError;
}

// ---------- Processa 1 job de classificação + upsert final ----------
async function processClassifyJob(supabase: any, job: MetaRefreshJob) {
  const { loadActiveBlacklist, loadCategoryVocabulary, loadMiningSettings, buildBlacklistMatcher } =
    await import("@/lib/mining-config.server");
  const { pickCategory } = await import("@/lib/category-scoring");

  const adIds = job.payload.ad_archive_ids as string[];

  const [rawRes, snapRes, blacklist, vocabulary, settings, pageCountsRes] = await Promise.all([
    supabase.rpc("mining_get_raw_rows", { p_run_id: job.run_id, p_ids: adIds }),
    supabase.rpc("mining_get_snapshot_rows", { p_run_id: job.run_id, p_ids: adIds }),
    loadActiveBlacklist(),
    loadCategoryVocabulary(),
    loadMiningSettings(),
    supabase.rpc("mining_get_page_counts", { p_run_id: job.run_id }),
  ]);

  if (rawRes.error) throw new Error(`ler raw: ${rawRes.error.message}`);

  const matchBlacklist = buildBlacklistMatcher(blacklist);
  const allowedLangs = new Set((settings.languages ?? []).map((l: string) => l.toUpperCase()));

  const snapshotByAd = new Map<string, any>();
  for (const s of snapRes.data ?? []) snapshotByAd.set(s.ad_archive_id, s);

  const pageCounts = new Map<string, number>();
  for (const r of pageCountsRes.data ?? []) pageCounts.set(r.page_id, Number(r.cnt));

  const compositeSeen = new Set<string>();
  const rowsToUpsert: Record<string, unknown>[] = [];
  const skipped = { blacklist: 0, language: 0, category: 0, duplicate: 0, noLanding: 0, lowRelevance: 0 };

  for (const raw of rawRes.data ?? []) {
    try {
      const ad = raw.raw as MetaAdItem;
      const snapshot = snapshotByAd.get(raw.ad_archive_id);
      // A Meta passou a bloquear a leitura do snapshot (retorna página de erro),
      // então o domínio do anúncio (link caption) é a fonte principal de destino.
      const caption = ad.ad_creative_link_captions?.[0]?.trim() ?? "";
      const captionLink = caption
        ? caption.startsWith("http")
          ? caption
          : `https://${caption.replace(/^\/+/, "")}`
        : null;
      const media = {
        imageUrl: snapshot?.image_url ?? null,
        videoUrl: snapshot?.video_url ?? null,
        linkUrl: snapshot?.link_url ?? captionLink,
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

      // Sem criativo/link não é motivo para descartar (a Meta não expõe mídia na
      // API pública); descartamos apenas anúncios sem nenhum texto aproveitável.
      if (!headline.trim()) {
        skipped.noLanding++;
        continue;
      }

      // Categoria por relevância no texto completo (inclui link de destino),
      // não pelo termo pesquisado.
      const relevance = pickCategory({
        text: `${raw.page_name} ${title} ${bodyText} ${desc} ${media.linkUrl ?? ""}`,
        searchCategory: raw.category ?? null,
        vocabulary,
        hasPrice,
        hasLanding,
        activeDays,
      });
      if (!relevance.category) {
        skipped.lowRelevance++;
        continue;
      }
      const finalCategory = relevance.category;

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
        ad_snapshot_url: stripSnapshotSecrets(raw.ad_snapshot_url),
        page_url: `https://www.facebook.com/${raw.page_id}`,
        link_url: media.linkUrl,
        ad_start_date: ad.ad_delivery_start_time ?? null,
        is_active: true,
        active_days: activeDays,
        active_ads_count: activeAdsCount,
        status: classifyStatus(activeDays, activeAdsCount),
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
    const { data, error } = await supabase.rpc("mining_upsert_offers", { p_rows: rowsToUpsert });
    if (error) dbError = `upsert meta_offers: ${error.message}`;
    else upserts = data ?? rowsToUpsert.length;
  }

  await jobLog(supabase, job.run_id, "classify.upsert", `classificados: ${upserts} gravados de ${adIds.length}`, {
    processed: adIds.length,
    upserts,
    ...skipped,
  });

  return dbError;
}

// ---------- Finaliza a run: deactivate + métricas + fecha o registro ----------
async function processFinalizeJob(supabase: any, job: MetaRefreshJob) {
  const { data: startedAt } = await supabase.rpc("mining_get_run_started_at", { p_run_id: job.run_id });

  // Só uma run de cobertura COMPLETA pode desativar ofertas que não apareceram.
  // Runs parciais (fatia de palavras por rotação ou categoria específica)
  // desativariam indevidamente todo o acervo.
  const { data: runRow } = await supabase
    .from("meta_refresh_runs")
    .select("details")
    .eq("id", job.run_id)
    .maybeSingle();
  const runDetails = (runRow?.details ?? {}) as Record<string, unknown>;
  const coverage = runDetails["coverage"] === "full" ? "full" : "partial";

  let deactivated = 0;
  if (coverage === "full") {
    const { data } = await supabase.rpc("mining_deactivate_stale", {
      p_started_at: startedAt ?? new Date().toISOString(),
    });
    deactivated = Number(data ?? 0);
  }
  const { data: pagesSeen } = await supabase.rpc("mining_count_pages_seen", { p_run_id: job.run_id });
  const { data: sums } = await supabase.rpc("mining_sum_job_logs", { p_run_id: job.run_id });
  const upserts = Number(sums?.[0]?.upserts ?? 0);
  const searchErrors = Number(sums?.[0]?.search_errors ?? 0);

  const status = searchErrors > 0 ? "partial" : upserts > 0 ? "success" : "blocked";
  const finishedAt = new Date().toISOString();

  await supabase.rpc("mining_update_run", {
    p_run_id: job.run_id,
    p_status: status,
    p_finished_at: finishedAt,
    p_phase: "done",
    p_offers_upserted: upserts,
    p_pages_seen: pagesSeen ?? 0,
    p_error: searchErrors > 0 ? `${searchErrors} erro(s) durante a coleta — ver mining_logs` : null,
    p_details: { deactivated, search_errors: searchErrors, coverage },
  });

  await supabase.rpc("mining_log", {
    p_kind: "run",
    p_status: status,
    p_summary: `run finalizada: ${upserts} ofertas, ${pagesSeen ?? 0} páginas, ${deactivated} desativadas (cobertura ${coverage})`,
    p_details: {
      run_id: job.run_id,
      started_at: startedAt,
      finished_at: finishedAt,
      upserts,
      pages_seen: pagesSeen ?? 0,
      deactivated,
      coverage,
      search_errors: searchErrors,
    },
  });

  await supabase.rpc("mining_cleanup_run", { p_run_id: job.run_id });

  return null;
}

// Enfileira os lotes de classificação/upsert de uma run.
async function enqueueClassifyJobs(supabase: any, runId: string) {
  const { data: rawRows } = await supabase.rpc("mining_get_raw_ids", { p_run_id: runId });
  const ids = (rawRows ?? []).map((r: any) => r.ad_archive_id);
  const jobs = [];
  for (let i = 0; i < ids.length; i += ADS_PER_CLASSIFY_JOB) {
    jobs.push({
      run_id: runId,
      kind: "classify.upsert",
      payload: { ad_archive_ids: ids.slice(i, i + ADS_PER_CLASSIFY_JOB) },
    });
  }
  if (jobs.length) await supabase.rpc("mining_enqueue_jobs", { p_jobs: jobs });
}

// ---------- Depois de um job terminar, decide se avança de fase ----------
async function maybeAdvancePhase(supabase: any, job: MetaRefreshJob) {
  if (job.kind === "meta.search") {
    if ((await remainingCount(supabase, job.run_id, "meta.search")) > 0) return;
    // Fase de snapshot desativada: a Meta bloqueia a leitura do ad_snapshot_url
    // (devolve página de erro), então vamos direto para a classificação.
    const { data: advanced } = await supabase.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "search",
      p_to_phase: "snapshot",
    });
    if (!advanced) return;
    const { data: toClassify } = await supabase.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "snapshot",
      p_to_phase: "classify",
    });
    if (toClassify) await enqueueClassifyJobs(supabase, job.run_id);
  }

  // Runs antigas ainda podem ter jobs de snapshot na fila.
  if (job.kind === "snapshot.extract") {
    if ((await remainingCount(supabase, job.run_id, "snapshot.extract")) > 0) return;
    const { data: advanced } = await supabase.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "snapshot",
      p_to_phase: "classify",
    });
    if (!advanced) return;
    await enqueueClassifyJobs(supabase, job.run_id);
  }

  if (job.kind === "classify.upsert") {
    if ((await remainingCount(supabase, job.run_id, "classify.upsert")) > 0) return;
    const { data: advanced } = await supabase.rpc("try_advance_run_phase", {
      p_run_id: job.run_id,
      p_from_phase: "classify",
      p_to_phase: "finalize",
    });
    if (!advanced) return;
    await supabase.rpc("mining_enqueue_jobs", {
      p_jobs: [{ run_id: job.run_id, kind: "run.finalize", payload: {} }],
    });
  }
}

async function authorize(
  request: Request,
): Promise<{ ok: true; userId?: string } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) return { ok: true };

  // Canonical pg_cron authentication: apikey header with the Supabase anon key.
  const apikey = request.headers.get("apikey");
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (apikey && publishableKey && apikey === publishableKey) return { ok: true };

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer) {
    try {
      const supabase = await serverSupabaseAnon();
      const { data, error } = await supabase.auth.getUser(bearer);
      if (error || !data.user) return { ok: false, reason: "invalid_token" };
      return { ok: true, userId: data.user.id };
    } catch {
      return { ok: false, reason: "auth_error" };
    }
  }
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
        if (auth.userId) {
          const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc(
            "mining_is_admin",
            { p_user_id: auth.userId },
          );
          if (roleError) {
            console.error("refresh-worker admin role check error", roleError.message);
            return Response.json(
              { ok: false, error: "authorization_check_failed" },
              { status: 500 },
            );
          }
          if (!isAdmin) {
            return Response.json(
              { ok: false, error: "unauthorized", reason: "not_admin" },
              { status: 403 },
            );
          }
        }
        const supabase = supabaseAdmin;

        const { data: jobs, error: claimErr } = await supabase.rpc("claim_refresh_jobs", {
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

        // Processa os jobs em paralelo, respeitando o rate limit da Meta.
        const settled = await Promise.allSettled(
          claimed.map(async (job) => {
            try {
              if (job.kind === "meta.search") {
                const error = await processSearchJob(supabase, job);
                return { job, error };
              }
              if (job.kind === "snapshot.extract") {
                const error = await processSnapshotJob(supabase, job);
                return { job, error };
              }
              if (job.kind === "classify.upsert") {
                const error = await processClassifyJob(supabase, job);
                return { job, error };
              }
              if (job.kind === "run.finalize") {
                const error = await processFinalizeJob(supabase, job);
                return { job, error };
              }
              return { job, error: `kind desconhecido: ${job.kind}` };
            } catch (err) {
              return { job, error: err as Error };
            }
          }),
        );

        const results = [];
        for (const outcome of settled) {
          if (outcome.status === "rejected") {
            // Não deveria acontecer — errors já são capturados dentro do map.
            continue;
          }
          const { job, error } = outcome.value;
          let errorMessage: string | null = null;
          let rateLimited = false;
          let collectedAds = 0;

          if (error instanceof RateLimitError) {
            rateLimited = true;
            collectedAds = error.collectedAds;
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === "string") {
            errorMessage = error;
          }

          if (rateLimited) {
            // Salva o que já conseguiu coletar e re-enfileira o restante para depois.
            if (collectedAds > 0) {
              await jobLog(supabase, job.run_id, "meta.search", `rate limit após ${collectedAds} anúncios coletados`, {
                collected_ads: collectedAds,
                backoff_minutes: RATE_LIMIT_BACKOFF_MS / 60000,
              });
            }
            await requeueJob(supabase, job.id, RATE_LIMIT_BACKOFF_MS);
          } else {
            await markJobDone(supabase, job.id, errorMessage);
            if (!errorMessage) {
              try {
                await maybeAdvancePhase(supabase, job);
              } catch (err) {
                await jobLog(supabase, job.run_id, job.kind, "erro ao avançar fase", {
                  error: (err as Error).message,
                });
              }
            }
          }
          results.push({
            id: job.id,
            kind: job.kind,
            error: errorMessage,
            rate_limited: rateLimited,
          });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
