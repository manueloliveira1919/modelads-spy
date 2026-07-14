import { createFileRoute } from "@tanstack/react-router";
import { getActiveSearchPlan } from "@/lib/meta-keywords";
import { classifyStatus, detectNoise, inferProductType, inferStructure } from "@/lib/offer-heuristics";
import { classifyCategoryFromText } from "@/lib/meta-keywords";

// Endpoint chamado pelo cron (pg_cron) a cada 24h para atualizar as ofertas.
// Também pode ser disparado manualmente via POST autenticado com apikey.

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
const PAGE_LIMIT = 50;

async function fetchMeta(params: URLSearchParams): Promise<MetaResponse> {
  const url = `${META_API}?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as MetaResponse;
  if (!res.ok || json.error) {
    throw new Error(`Meta API ${res.status}: ${json.error?.message ?? "unknown"}`);
  }
  return json;
}

async function searchTerm(opts: {
  token: string;
  term: string;
  country: string;
}): Promise<MetaAdItem[]> {
  const params = new URLSearchParams({
    access_token: opts.token,
    search_terms: opts.term,
    ad_reached_countries: JSON.stringify([opts.country]),
    ad_active_status: "ACTIVE",
    ad_type: "ALL",
    limit: String(PAGE_LIMIT),
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
  const json = await fetchMeta(params);
  return json.data ?? [];
}

function computeActiveDays(start?: string): number {
  if (!start) return 0;
  const s = new Date(start).getTime();
  if (Number.isNaN(s)) return 0;
  const diff = Date.now() - s;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Faz scraping da página do snapshot da Meta pra extrair a mídia real e o link
// de destino do anúncio. A API pública não retorna esses campos diretamente.
// Se qualquer etapa falhar (403, HTML mudou, timeout), retorna null nos campos.
interface SnapshotMedia {
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
}

function decodeMetaJsonString(raw: string): string {
  // Meta serializa em JSON dentro do HTML — precisa desescapar \/ e \u00XX.
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


async function runRefresh() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não configurado");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: runRow } = await supabaseAdmin
    .from("meta_refresh_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  const plan = getActiveSearchPlan();
  const errors: string[] = [];
  // Mapa: page_id -> { ads: MetaAdItem[], meta: { category, language, country, term } }
  const byPage = new Map<
    string,
    {
      ads: (MetaAdItem & { _category: string; _language: string; _term: string })[];
      pageName: string;
    }
  >();

  for (const step of plan) {
    try {
      const items = await searchTerm({
        token,
        term: step.term,
        country: step.country,
      });
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
      errors.push(`${step.category}/${step.term}: ${(err as Error).message}`);
    }
  }

  // Marca todas as ofertas atuais como inativas — as que reaparecerem serão reativadas no upsert.
  await supabaseAdmin
    .from("meta_offers")
    .update({ is_active: false })
    .eq("is_active", true);

  let upserts = 0;

  let skippedNoise = 0;
  for (const [pageId, bucket] of byPage.entries()) {
    const activeAdsCount = bucket.ads.length;
    const status = classifyStatus(activeAdsCount);

    // Deduplica anúncios por ad archive id, mantém o primeiro por página
    const seen = new Set<string>();
    for (const ad of bucket.ads) {
      const archiveId = ad.id;
      if (!archiveId || seen.has(archiveId)) continue;
      seen.add(archiveId);

      const bodyText = ad.ad_creative_bodies?.[0] ?? "";
      const title = ad.ad_creative_link_titles?.[0] ?? "";
      const desc = ad.ad_creative_link_descriptions?.[0] ?? "";
      const fullText = `${bucket.pageName} ${title} ${bodyText} ${desc}`;

      // Bloqueia anúncios políticos/eleitorais e apps de drama/novela.
      if (detectNoise(fullText)) {
        skippedNoise++;
        continue;
      }

      const structure = inferStructure(`${title} ${bodyText}`);
      const activeDays = computeActiveDays(ad.ad_delivery_start_time);
      const snapshot = ad.ad_snapshot_url ?? null;

      // Tenta extrair mídia direta + link de destino via scraping do snapshot.
      const media = await extractSnapshotMedia(snapshot);
      const creativeUrl = media.videoUrl ?? media.imageUrl ?? null;
      const creativeType: "image" | "video" = media.videoUrl ? "video" : "image";

      // Só atribui a categoria sugerida pelo termo se o texto realmente confirma.
      // Caso contrário, marca como "Sem categoria" (oculta por padrão no Dashboard).
      const finalCategory = classifyCategoryFromText(
        `${title} ${bodyText} ${desc}`,
        ad._category as import("@/lib/meta-keywords").MetaCategory,
      );

      const row = {
        ad_archive_id: archiveId,
        page_id: pageId,
        page_name: bucket.pageName,
        category: finalCategory,
        language: ad._language,
        country: "BR",
        headline: title || bodyText.slice(0, 120),
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
        last_seen: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from("meta_offers")
        .upsert(row, { onConflict: "ad_archive_id" });
      if (error) {
        errors.push(`upsert ${archiveId}: ${error.message}`);
      } else {
        upserts++;
      }
    }
  }


  if (runId) {
    await supabaseAdmin
      .from("meta_refresh_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: errors.length ? "partial" : "success",
        offers_upserted: upserts,
        pages_seen: byPage.size,
        error: errors.length ? errors.slice(0, 5).join(" | ") : null,
        details: { errors: errors.slice(0, 50), plan_size: plan.length },
      })
      .eq("id", runId);
  }

  return {
    ok: true,
    pages: byPage.size,
    offers: upserts,
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
