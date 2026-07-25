import { createFileRoute } from "@tanstack/react-router";
import {
  classifyStatus,
  extractPrice,
  inferProductType,
  inferStructure,
  stripSnapshotSecrets,
} from "@/lib/offer-heuristics";

// Endpoint chamado pelo cron (pg_cron) a cada 24h para atualizar as ofertas.
// Também pode ser disparado manualmente pelo painel admin.

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

// Paginate via paging.next (Meta returns full URL), respecting max_pages.
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

async function extractSnapshotMedia(snapshotUrl: string | null): Promise<SnapshotMedia> {
  if (!snapshotUrl) return { imageUrl: null, videoUrl: null, linkUrl: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(snapshotUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { imageUrl: null, videoUrl: null, linkUrl: null };
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
  } catch {
    return { imageUrl: null, videoUrl: null, linkUrl: null };
  }
}

// Score de qualidade 0-100. Cada critério vale ~12 pts; escalabilidade pesa mais.
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

async function runRefresh() {
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

  const startedAt = new Date().toISOString();
  const { data: runRow } = await supabaseAdmin
    .from("meta_refresh_runs")
    .insert({ status: "running", started_at: startedAt })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  const [keywords, blacklist, activeCategories, settings] = await Promise.all([
    loadActiveKeywords(),
    loadActiveBlacklist(),
    loadActiveCategories(),
    loadMiningSettings(),
  ]);
  const plan = buildSearchPlan(keywords, settings);
  const matchBlacklist = buildBlacklistMatcher(blacklist);
  const allowedLangs = new Set(
    (settings.languages ?? []).map((l) => l.toUpperCase()),
  );

  const errors: string[] = [];
  const discardReasons = new Map<string, number>();
  const bumpDiscard = (reason: string) =>
    discardReasons.set(reason, (discardReasons.get(reason) ?? 0) + 1);

  const byPage = new Map<
    string,
    {
      ads: (MetaAdItem & {
        _category: string | null;
        _language: string;
        _term: string;
      })[];
      pageName: string;
    }
  >();

  let searched = 0;
  for (const step of plan) {
    try {
      const items = await searchTermPaginated({
        token,
        term: step.term,
        country: step.country,
        limit: settings.per_keyword_limit,
        maxPages: settings.max_pages,
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
    } catch (err) {
      errors.push(`${step.category ?? "—"}/${step.term}: ${(err as Error).message}`);
    }
  }

  const totalAdsCollected = Array.from(byPage.values()).reduce(
    (acc, b) => acc + b.ads.length,
    0,
  );
  const errorRate = plan.length > 0 ? errors.length / plan.length : 1;
  const collectionValid =
    byPage.size > 0 && totalAdsCollected > 0 && errorRate < 0.5;

  let upserts = 0;
  let skippedBlacklist = 0;
  let skippedDuplicate = 0;
  let skippedLanguage = 0;
  let skippedNoCategory = 0;
  let skippedNoLanding = 0;
  let deactivated = 0;

  if (collectionValid) {
    // Dedup composto por (page_id + headline + landing) através do run inteiro.
    const compositeSeen = new Set<string>();

    for (const [pageId, bucket] of byPage.entries()) {
      const activeAdsCount = bucket.ads.length;
      const status = classifyStatus(activeAdsCount);

      const seenArchive = new Set<string>();
      for (const ad of bucket.ads) {
        const archiveId = ad.id;
        if (!archiveId) continue;
        if (seenArchive.has(archiveId)) {
          skippedDuplicate++;
          bumpDiscard("duplicate_archive_id");
          continue;
        }
        seenArchive.add(archiveId);

        const bodyText = ad.ad_creative_bodies?.[0] ?? "";
        const title = ad.ad_creative_link_titles?.[0] ?? "";
        const desc = ad.ad_creative_link_descriptions?.[0] ?? "";
        const fullText = `${bucket.pageName} ${title} ${bodyText} ${desc}`;

        const snapshot = stripSnapshotSecrets(ad.ad_snapshot_url);
        const media = await extractSnapshotMedia(snapshot);

        // 1) Blacklist (palavra, expressão, página, domínio, regex).
        const hit = matchBlacklist({
          text: fullText,
          pageName: bucket.pageName,
          link: media.linkUrl,
        });
        if (hit) {
          skippedBlacklist++;
          bumpDiscard(`blacklist:${hit.kind}`);
          continue;
        }

        // 2) Idioma — se admin restringiu, respeita.
        const language = normalizeAdLanguage(ad.languages, ad._language);
        if (allowedLangs.size && !allowedLangs.has(language) && !allowedLangs.has("BR")) {
          // BR ~ PT: quando lista permitir BR, aceitamos PT.
          if (!(allowedLangs.has("BR") && language === "PT")) {
            skippedLanguage++;
            bumpDiscard("language_mismatch");
            continue;
          }
        }

        // 3) Categoria: precisa ter categoria válida vinda da keyword.
        const finalCategory =
          ad._category && activeCategories.has(ad._category)
            ? ad._category
            : null;
        if (!finalCategory) {
          skippedNoCategory++;
          bumpDiscard("category_missing");
          continue;
        }

        // 4) Dedupe composto — page_id + headline + landing.
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

        // Landing page é um mínimo importante: se não temos landing E não temos criativo,
        // é ruído — descarta. Se tem pelo menos criativo, mantém (comum em ads sem CTA externo).
        if (!hasLanding && !hasCreative) {
          skippedNoLanding++;
          bumpDiscard("no_landing_no_creative");
          continue;
        }

        const qualityScore = computeQualityScore({
          languageOk: allowedLangs.size === 0 || allowedLangs.has(language) || (allowedLangs.has("BR") && language === "PT"),
          categoryOk: true,
          hasPrice,
          hasLanding,
          activeAds: activeAdsCount,
          activeDays,
          hasCreative,
        });

        const row = {
          ad_archive_id: archiveId,
          page_id: pageId,
          page_name: bucket.pageName,
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
          status,
          structure,
          product_type: inferProductType(`${title} ${bodyText} ${desc}`),
          search_term: ad._term,
          quality_score: qualityScore,
          last_seen: new Date().toISOString(),
        };

        // Sempre upsert por ad_archive_id — prioriza atualização sobre duplicação.
        const { error } = await supabaseAdmin
          .from("meta_offers")
          .upsert(row, { onConflict: "ad_archive_id" });
        if (error) errors.push(`upsert ${archiveId}: ${error.message}`);
        else upserts++;
      }
    }

    const { count } = await supabaseAdmin
      .from("meta_offers")
      .update({ is_active: false }, { count: "exact" })
      .eq("is_active", true)
      .lt("last_seen", startedAt);
    deactivated = count ?? 0;
  } else {
    errors.push(
      `coleta invalida: pages=${byPage.size} ads=${totalAdsCollected} errorRate=${errorRate.toFixed(2)} — mantendo ofertas atuais ativas`,
    );
  }

  const runStatus = !collectionValid
    ? "blocked"
    : errors.length
      ? "partial"
      : "success";

  const finishedAt = new Date().toISOString();
  const discardBreakdown = Object.fromEntries(discardReasons.entries());
  const skippedNoise =
    skippedBlacklist + skippedDuplicate + skippedLanguage + skippedNoCategory + skippedNoLanding;

  if (runId) {
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
        } as never,
      })
      .eq("id", runId);
  }

  await supabaseAdmin.from("mining_logs").insert({
    kind: "run",
    status: runStatus,
    summary: `plan=${plan.length} pages=${byPage.size} upserts=${upserts} descartados=${skippedNoise} erros=${errors.length}`,
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
  };
}

export const Route = createFileRoute("/api/public/hooks/refresh-offers")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "refresh-offers",
          hint: "POST para disparar a atualização (usado pelo cron).",
        }),
      POST: async () => {
        try {
          const result = await runRefresh();
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
