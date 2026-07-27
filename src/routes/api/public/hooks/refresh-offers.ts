import { createFileRoute } from "@tanstack/react-router";
import {
  classifyStatus,
  extractPrice,
  inferProductType,
  inferStructure,
  stripSnapshotSecrets,
} from "@/lib/offer-heuristics";

// Endpoint chamado pelo cron (pg_cron) e pelo painel admin.
// Segurança: exige service-role, x-cron-secret ou bearer de usuário admin.

interface MetaAdItem {
  id?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  languages?: string[];
  publisher_platforms?: string[];
}

interface MetaResponse {
  data?: MetaAdItem[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message?: string; code?: number };
}

const META_API = "https://graph.facebook.com/v20.0/ads_archive";
const SNAPSHOT_BATCH_SIZE = 8;
const SNAPSHOT_TIMEOUT_MS = 8000;
const SNAPSHOT_MAX_ATTEMPTS = 3;

async function fetchMeta(url: string): Promise<MetaResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as MetaResponse;
  if (!res.ok || json.error) {
    throw new Error(`Meta API ${res.status}: ${json.error?.message ?? "unknown"}`);
  }
  return json;
}

function buildSearchUrl(opts: {
  token: string;
  term: string;
  country: string;
  limit: number;
}): string {
  const params = new URLSearchParams({
    access_token: opts.token,
    search_terms: opts.term,
    ad_reached_countries: JSON.stringify([opts.country]),
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    limit: String(opts.limit),
    fields: [
      "id",
      "page_id",
      "page_name",
      "ad_creative_bodies",
      "ad_creative_link_titles",
      "ad_creative_link_descriptions",
      "ad_snapshot_url",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "languages",
      "publisher_platforms",
    ].join(","),
  });
  return `${META_API}?${params.toString()}`;
}

async function searchTermPaginated(opts: {
  token: string;
  term: string;
  country: string;
  limit: number;
  maxPages: number;
}): Promise<MetaAdItem[]> {
  const all: MetaAdItem[] = [];
  let url = buildSearchUrl(opts);
  for (let page = 0; page < Math.max(1, opts.maxPages); page++) {
    const json = await fetchMeta(url);
    all.push(...(json.data ?? []));
    const next = json.paging?.next;
    if (!next) break;
    url = next;
  }
  return all;
}

function computeActiveDays(start?: string): number {
  if (!start) return 0;
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return 0;
  const diff = Date.now() - s;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function normalizeAdLanguage(langs: string[] | undefined, fallback: string): string {
  const first = (langs?.[0] || "").toLowerCase();
  if (first.startsWith("pt")) return "PT";
  if (first.startsWith("es")) return "ES";
  if (first.startsWith("en")) return "EN";
  if (!first) return fallback === "BR" ? "PT" : fallback;
  return first.slice(0, 2).toUpperCase();
}

interface SnapshotMedia {
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
}

function decodeMetaJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\\//g, "/");
  }
}

function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) return decodeMetaJsonString(m[1]);
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchSnapshotOnce(snapshotUrl: string): Promise<SnapshotMedia> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);
  try {
    const res = await fetch(snapshotUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`snapshot http ${res.status}`);
    const html = await res.text();
    const videoUrl = firstMatch(html, [
      /"video_hd_url":"([^"]+)"/,
      /"video_sd_url":"([^"]+)"/,
    ]);
    const imageUrl = firstMatch(html, [
      /"original_image_url":"([^"]+)"/,
      /"resized_image_url":"([^"]+)"/,
      /"image_url":"([^"]+)"/,
    ]);
    const linkUrl = firstMatch(html, [
      /"link_url":"([^"]+)"/,
      /"snapshot_url":"([^"]+)".*?"link_url":"([^"]+)"/,
    ]);
    return { imageUrl, videoUrl, linkUrl };
  } finally {
    clearTimeout(timer);
  }
}

interface SnapshotOutcome {
  media: SnapshotMedia;
  attempts: number;
  error: string | null;
}

async function extractSnapshotMedia(
  snapshotUrl: string | null,
): Promise<SnapshotOutcome> {
  const empty: SnapshotMedia = { imageUrl: null, videoUrl: null, linkUrl: null };
  if (!snapshotUrl) return { media: empty, attempts: 0, error: null };
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= SNAPSHOT_MAX_ATTEMPTS; attempt++) {
    try {
      const media = await fetchSnapshotOnce(snapshotUrl);
      return { media, attempts: attempt, error: null };
    } catch (err) {
      lastErr = err;
      if (attempt < SNAPSHOT_MAX_ATTEMPTS) {
        // Backoff exponencial: 400ms, 800ms, ...
        await sleep(400 * 2 ** (attempt - 1));
      }
    }
  }
  return {
    media: empty,
    attempts: SNAPSHOT_MAX_ATTEMPTS,
    error: (lastErr as Error)?.message ?? "snapshot failed",
  };
}

// Executa `fn` em lotes paralelos de `size`. Erros individuais viram resultados nulos.
async function runInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const results = await Promise.allSettled(chunk.map((it, j) => fn(it, i + j)));
    results.forEach((r, j) => {
      out[i + j] = r.status === "fulfilled" ? r.value : null;
    });
  }
  return out;
}

function computeQualityScore(inputs: {
  languageOk: boolean;
  categoryOk: boolean;
  hasPrice: boolean;
  hasLanding: boolean;
  activeAds: number;
  activeDays: number;
  hasCreative: boolean;
}): number {
  let score = 0;
  if (inputs.languageOk) score += 12;
  if (inputs.categoryOk) score += 14;
  if (inputs.hasPrice) score += 12;
  if (inputs.hasLanding) score += 14;
  if (inputs.hasCreative) score += 12;
  if (inputs.activeAds >= 30) score += 18;
  else if (inputs.activeAds >= 10) score += 12;
  else if (inputs.activeAds >= 4) score += 6;
  if (inputs.activeDays >= 30) score += 18;
  else if (inputs.activeDays >= 15) score += 12;
  else if (inputs.activeDays >= 7) score += 6;
  return Math.min(100, score);
}

interface RunOptions {
  triggeredBy: "cron" | "admin" | "service";
  respectAutoRefresh: boolean;
}

async function runRefresh(opts: RunOptions) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não configurado");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {
    loadActiveKeywords,
    loadActiveBlacklist,
    loadActiveCategories,
    loadMiningSettings,
    buildSearchPlan,
    buildBlacklistMatcher,
  } = await import("@/lib/mining-config.server");

  const t0 = Date.now();
  const startedAt = new Date().toISOString();

  // Checkpoint persistente — grava um row em mining_logs para cada etapa.
  // Não altera a lógica do pipeline; apenas observabilidade.
  const runTag = `run_${t0}_${Math.random().toString(36).slice(2, 8)}`;
  const checkpoint = async (
    step: string,
    payload: Record<string, unknown> = {},
    status: "ok" | "error" | "info" = "info",
  ) => {
    try {
      await supabaseAdmin.from("mining_logs").insert({
        kind: "checkpoint",
        status,
        summary: `[${runTag}] ${step}`,
        details: {
          step,
          run_tag: runTag,
          ts: new Date().toISOString(),
          elapsed_ms: Date.now() - t0,
          ...payload,
        } as never,
      });
    } catch {
      /* nunca quebrar pipeline por causa de log */
    }
  };

  await checkpoint("run.start", { triggered_by: opts.triggeredBy, started_at: startedAt });

  const tLoadStart = Date.now();
  const [keywords, blacklist, activeCategories, settings] = await Promise.all([
    loadActiveKeywords(),
    loadActiveBlacklist(),
    loadActiveCategories(),
    loadMiningSettings(),
  ]);
  await checkpoint("config.loaded", {
    load_ms: Date.now() - tLoadStart,
    keywords_count: keywords.length,
    blacklist_count: blacklist.length,
    categories_count: activeCategories.size,
    settings_snapshot: settings as unknown as Record<string, unknown>,
  });

  // Cron respeita mining_settings.auto_refresh.
  if (opts.respectAutoRefresh && !settings.auto_refresh) {
    await supabaseAdmin.from("mining_logs").insert({
      kind: "run",
      status: "skipped",
      summary: "auto_refresh desligado — cron ignorado",
      details: { triggered_by: opts.triggeredBy, started_at: startedAt } as never,
    });
    await checkpoint("run.skipped", { reason: "auto_refresh_disabled" });
    return { ok: true, skipped: true, reason: "auto_refresh_disabled" };
  }

  const { data: runRow } = await supabaseAdmin
    .from("meta_refresh_runs")
    .insert({ status: "running", started_at: startedAt })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;
  await checkpoint("run.created", { run_id: runId });

  const plan = buildSearchPlan(keywords, settings);
  const matchBlacklist = buildBlacklistMatcher(blacklist);
  const allowedLangs = new Set(
    (settings.languages ?? []).map((l) => l.toUpperCase()),
  );
  await checkpoint("plan.built", { plan_size: plan.length, allowed_langs: [...allowedLangs] });

  const errors: string[] = [];
  const discardReasons = new Map<string, number>();
  const bumpDiscard = (reason: string) =>
    discardReasons.set(reason, (discardReasons.get(reason) ?? 0) + 1);

  type EnrichedAd = MetaAdItem & {
    _category: string | null;
    _language: string;
    _term: string;
  };
  const byPage = new Map<string, { ads: EnrichedAd[]; pageName: string }>();

  // ---------- Fase 1: consultas Meta ----------
  const tMetaStart = Date.now();
  let searched = 0;
  await checkpoint("meta.phase.start", { plan_size: plan.length });
  let stepIndex = 0;
  for (const step of plan) {
    stepIndex++;
    const tStep = Date.now();
    await checkpoint("keyword.start", {
      index: stepIndex,
      total: plan.length,
      term: step.term,
      category: step.category,
      country: step.country,
      language: step.language,
    });
    try {
      const items = await searchTermPaginated({
        token,
        term: step.term,
        country: step.country,
        limit: settings.per_keyword_limit,
        maxPages: settings.max_pages,
      });
      await checkpoint("meta.fetch.done", {
        term: step.term,
        returned: items.length,
        fetch_ms: Date.now() - tStep,
      });
      searched += items.length;
      for (const ad of items) {
        const pageId = ad.page_id;
        if (!pageId) continue;
        const bucket = byPage.get(pageId) ?? {
          ads: [],
          pageName: ad.page_name ?? "Página desconhecida",
        };
        bucket.pageName = ad.page_name ?? bucket.pageName;
        bucket.ads.push({
          ...ad,
          _category: step.category,
          _language: step.language,
          _term: step.term,
        });
        byPage.set(pageId, bucket);
      }
      await checkpoint("keyword.done", {
        term: step.term,
        step_ms: Date.now() - tStep,
        pages_so_far: byPage.size,
        searched_so_far: searched,
      });
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`${step.category ?? "—"}/${step.term}: ${msg}`);
      await checkpoint(
        "keyword.error",
        { term: step.term, error: msg, step_ms: Date.now() - tStep },
        "error",
      );
    }
  }
  const metaMs = Date.now() - tMetaStart;

  const totalAdsCollected = Array.from(byPage.values()).reduce(
    (acc, b) => acc + b.ads.length,
    0,
  );
  const errorRate = plan.length > 0 ? errors.length / plan.length : 1;
  const collectionValid =
    byPage.size > 0 && totalAdsCollected > 0 && errorRate < 0.5;

  await checkpoint("meta.phase.done", {
    meta_ms: metaMs,
    pages_seen: byPage.size,
    total_ads_collected: totalAdsCollected,
    error_rate: Number(errorRate.toFixed(3)),
    collection_valid: collectionValid,
    errors_so_far: errors.length,
  });


  let upserts = 0;
  let skippedBlacklist = 0;
  let skippedDuplicate = 0;
  let skippedLanguage = 0;
  let skippedNoCategory = 0;
  let skippedNoLanding = 0;
  let deactivated = 0;
  let snapshotErrors = 0;
  let snapshotRetries = 0;
  let snapshotMs = 0;
  let writeMs = 0;
  let classifyMs = 0;

  if (collectionValid) {
    // Achata todos os anúncios preservando o page bucket.
    type FlatAd = { pageId: string; pageName: string; activeAdsCount: number; ad: EnrichedAd };
    const flat: FlatAd[] = [];
    const seenArchiveGlobal = new Set<string>();
    for (const [pageId, bucket] of byPage.entries()) {
      for (const ad of bucket.ads) {
        const archiveId = ad.id;
        if (!archiveId) continue;
        if (seenArchiveGlobal.has(archiveId)) {
          skippedDuplicate++;
          bumpDiscard("duplicate_archive_id");
          continue;
        }
        seenArchiveGlobal.add(archiveId);
        flat.push({
          pageId,
          pageName: bucket.pageName,
          activeAdsCount: bucket.ads.length,
          ad,
        });
      }
    }

    // ---------- Fase 2: snapshots em paralelo ----------
    const tSnapStart = Date.now();
    const snapshotUrls = flat.map((f) => stripSnapshotSecrets(f.ad.ad_snapshot_url));
    await checkpoint("snapshot.phase.start", {
      total: snapshotUrls.length,
      batch_size: SNAPSHOT_BATCH_SIZE,
      timeout_ms: SNAPSHOT_TIMEOUT_MS,
    });
    const snapshotResults = await runInBatches(
      snapshotUrls,
      SNAPSHOT_BATCH_SIZE,
      (url) => extractSnapshotMedia(url),
    );
    snapshotMs = Date.now() - tSnapStart;
    for (const r of snapshotResults) {
      if (!r) {
        snapshotErrors++;
        continue;
      }
      if (r.error) snapshotErrors++;
      if (r.attempts > 1) snapshotRetries += r.attempts - 1;
    }
    await checkpoint("snapshot.phase.done", {
      snapshot_ms: snapshotMs,
      snapshot_errors: snapshotErrors,
      snapshot_retries: snapshotRetries,
      avg_snapshot_ms: snapshotUrls.length ? Math.round(snapshotMs / snapshotUrls.length) : 0,
    });


    // ---------- Fase 3: classificação + gravação ----------
    const tClassifyStart = Date.now();
    const compositeSeen = new Set<string>();
    const rowsToUpsert: Record<string, unknown>[] = [];

    for (let i = 0; i < flat.length; i++) {
      try {
        const { pageId, pageName, activeAdsCount, ad } = flat[i];
        const snapshotRes = snapshotResults[i];
        const media = snapshotRes?.media ?? { imageUrl: null, videoUrl: null, linkUrl: null };
        const snapshot = snapshotUrls[i];

        const bodyText = ad.ad_creative_bodies?.[0] ?? "";
        const title = ad.ad_creative_link_titles?.[0] ?? "";
        const desc = ad.ad_creative_link_descriptions?.[0] ?? "";
        const fullText = `${pageName} ${title} ${bodyText} ${desc}`;

        const hit = matchBlacklist({
          text: fullText,
          pageName,
          link: media.linkUrl,
        });
        if (hit) {
          skippedBlacklist++;
          bumpDiscard(`blacklist:${hit.kind}`);
          continue;
        }

        const language = normalizeAdLanguage(ad.languages, ad._language);
        if (allowedLangs.size && !allowedLangs.has(language) && !allowedLangs.has("BR")) {
          if (!(allowedLangs.has("BR") && language === "PT")) {
            skippedLanguage++;
            bumpDiscard("language_mismatch");
            continue;
          }
        }

        const finalCategory =
          ad._category && activeCategories.has(ad._category) ? ad._category : null;
        if (!finalCategory) {
          skippedNoCategory++;
          bumpDiscard("category_missing");
          continue;
        }

        const headline = title || bodyText.slice(0, 120);
        const compositeKey = `${pageId}|${headline.slice(0, 100)}|${media.linkUrl ?? ""}`;
        if (compositeSeen.has(compositeKey)) {
          skippedDuplicate++;
          bumpDiscard("duplicate_composite");
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

        if (!hasLanding && !hasCreative) {
          skippedNoLanding++;
          bumpDiscard("no_landing_no_creative");
          continue;
        }

        const qualityScore = computeQualityScore({
          languageOk:
            allowedLangs.size === 0 ||
            allowedLangs.has(language) ||
            (allowedLangs.has("BR") && language === "PT"),
          categoryOk: true,
          hasPrice,
          hasLanding,
          activeAds: activeAdsCount,
          activeDays,
          hasCreative,
        });

        rowsToUpsert.push({
          ad_archive_id: ad.id,
          page_id: pageId,
          page_name: pageName,
          category: finalCategory,
          language,
          country: "BR",
          headline,
          description: bodyText || desc,
          creative_url: creativeUrl,
          creative_type: creativeType,
          ad_snapshot_url: snapshot,
          page_url: `https://www.facebook.com/${pageId}`,
          link_url: media.linkUrl,
          ad_start_date: ad.ad_delivery_start_time ?? null,
          is_active: true,
          active_days: activeDays,
          active_ads_count: activeAdsCount,
          status: classifyStatus(activeAdsCount),
          structure,
          product_type: inferProductType(`${title} ${bodyText} ${desc}`),
          search_term: ad._term,
          quality_score: qualityScore,
          last_seen: new Date().toISOString(),
        });
      } catch (err) {
        errors.push(`classify ${flat[i]?.ad?.id}: ${(err as Error).message}`);
      }
    }
    classifyMs = Date.now() - tClassifyStart;
    await checkpoint("classify.phase.done", {
      classify_ms: classifyMs,
      rows_ready: rowsToUpsert.length,
      skipped_blacklist: skippedBlacklist,
      skipped_duplicate: skippedDuplicate,
      skipped_language: skippedLanguage,
      skipped_no_category: skippedNoCategory,
      skipped_no_landing: skippedNoLanding,
    });

    // ---------- Fase 4: upsert em lote ----------
    const tWriteStart = Date.now();
    const CHUNK = 200;
    await checkpoint("write.phase.start", { rows: rowsToUpsert.length, chunk: CHUNK });
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK);
      const tChunk = Date.now();
      try {
        const { error } = await supabaseAdmin
          .from("meta_offers")
          .upsert(chunk as never, { onConflict: "ad_archive_id" });
        if (error) errors.push(`upsert chunk: ${error.message}`);
        else upserts += chunk.length;
        await checkpoint("write.chunk.done", {
          offset: i,
          size: chunk.length,
          chunk_ms: Date.now() - tChunk,
          upserts_so_far: upserts,
          error: error?.message ?? null,
        });
      } catch (err) {
        errors.push(`upsert chunk: ${(err as Error).message}`);
        await checkpoint(
          "write.chunk.error",
          { offset: i, size: chunk.length, error: (err as Error).message },
          "error",
        );
      }
    }
    writeMs = Date.now() - tWriteStart;
    await checkpoint("write.phase.done", { write_ms: writeMs, upserts });

    try {
      const tDeact = Date.now();
      const { count } = await supabaseAdmin
        .from("meta_offers")
        .update({ is_active: false }, { count: "exact" })
        .eq("is_active", true)
        .lt("last_seen", startedAt);
      deactivated = count ?? 0;
      await checkpoint("deactivate.done", { deactivated, deactivate_ms: Date.now() - tDeact });
    } catch (err) {
      errors.push(`deactivate: ${(err as Error).message}`);
      await checkpoint("deactivate.error", { error: (err as Error).message }, "error");
    }
  } else {
    errors.push(
      `coleta invalida: pages=${byPage.size} ads=${totalAdsCollected} errorRate=${errorRate.toFixed(2)} — mantendo ofertas atuais ativas`,
    );
    await checkpoint(
      "collection.invalid",
      { pages: byPage.size, ads: totalAdsCollected, error_rate: Number(errorRate.toFixed(3)) },
      "error",
    );
  }


  const runStatus = !collectionValid
    ? "blocked"
    : errors.length
      ? "partial"
      : "success";

  const finishedAt = new Date().toISOString();
  const totalMs = Date.now() - t0;
  const discardBreakdown = Object.fromEntries(discardReasons.entries());
  const skippedNoise =
    skippedBlacklist +
    skippedDuplicate +
    skippedLanguage +
    skippedNoCategory +
    skippedNoLanding;

  const metrics = {
    total_ms: totalMs,
    meta_ms: metaMs,
    snapshot_ms: snapshotMs,
    classify_ms: classifyMs,
    write_ms: writeMs,
    snapshot_batch_size: SNAPSHOT_BATCH_SIZE,
    snapshot_errors: snapshotErrors,
    snapshot_retries: snapshotRetries,
    avg_snapshot_ms:
      totalAdsCollected > 0 ? Math.round(snapshotMs / totalAdsCollected) : 0,
    triggered_by: opts.triggeredBy,
  };

  if (runId) {
    await checkpoint("run.update.start", { run_id: runId, status: runStatus });
    await supabaseAdmin
      .from("meta_refresh_runs")
      .update({
        finished_at: finishedAt,
        status: runStatus,
        offers_upserted: upserts,
        pages_seen: byPage.size,
        error: errors.length ? errors.slice(0, 5).join(" | ") : null,
        details: {
          errors: errors.slice(0, 50),
          plan_size: plan.length,
          keywords_active: keywords.length,
          blacklist_active: blacklist.length,
          settings: settings as unknown as Record<string, unknown>,
          collection_valid: collectionValid,
          total_ads_collected: totalAdsCollected,
          error_rate: Number(errorRate.toFixed(3)),
          deactivated,
          skipped_blacklist: skippedBlacklist,
          skipped_duplicate: skippedDuplicate,
          skipped_language: skippedLanguage,
          skipped_no_category: skippedNoCategory,
          skipped_no_landing: skippedNoLanding,
          skipped_noise: skippedNoise,
          discard_breakdown: discardBreakdown,
          metrics,
          run_tag: runTag,
        } as never,
      })
      .eq("id", runId);
    await checkpoint("run.update.done", { run_id: runId });
  }

  await checkpoint("run.finished", {
    status: runStatus,
    total_ms: totalMs,
    upserts,
    pages: byPage.size,
    errors: errors.length,
  });


  await supabaseAdmin.from("mining_logs").insert({
    kind: "run",
    status: runStatus,
    summary: `plan=${plan.length} pages=${byPage.size} upserts=${upserts} descartados=${skippedNoise} erros=${errors.length} ${totalMs}ms`,
    details: {
      started_at: startedAt,
      finished_at: finishedAt,
      searched,
      approved: upserts,
      discarded: skippedNoise,
      discard_breakdown: discardBreakdown,
      deactivated,
      plan_size: plan.length,
      errors: errors.slice(0, 20),
      settings: settings as unknown as Record<string, unknown>,
      metrics,
    } as never,
  });

  return {
    ok: true,
    collectionValid,
    pages: byPage.size,
    offers: upserts,
    deactivated,
    skippedBlacklist,
    skippedDuplicate,
    skippedLanguage,
    skippedNoCategory,
    skippedNoLanding,
    errors: errors.length,
    plan: plan.length,
    metrics,
  };
}

// ---------- Autenticação do endpoint ----------
async function authorize(
  request: Request,
): Promise<{ ok: true; source: RunOptions["triggeredBy"] } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const headerCron = request.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) {
    return { ok: true, source: "cron" };
  }

  const apiKey = request.headers.get("apikey");
  if (serviceKey && apiKey && apiKey === serviceKey) {
    return { ok: true, source: "service" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (bearer && serviceKey && bearer === serviceKey) {
    return { ok: true, source: "service" };
  }
  if (bearer) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.auth.getUser(bearer);
      if (error || !data.user) return { ok: false, reason: "invalid_token" };
      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) return { ok: true, source: "admin" };
      return { ok: false, reason: "not_admin" };
    } catch {
      return { ok: false, reason: "auth_error" };
    }
  }

  return { ok: false, reason: "missing_credentials" };
}

export const Route = createFileRoute("/api/public/hooks/refresh-offers")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "refresh-offers",
          hint: "POST autenticado (admin bearer, service role ou x-cron-secret).",
        }),
      POST: async ({ request }) => {
        const auth = await authorize(request);
        if (!auth.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "unauthorized", reason: auth.reason }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }
        try {
          const result = await runRefresh({
            triggeredBy: auth.source,
            respectAutoRefresh: auth.source === "cron",
          });
          return Response.json(result);
        } catch (err) {
          const message = (err as Error).message;
          console.error("refresh-offers error", message);
          return new Response(
            JSON.stringify({ ok: false, error: message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
