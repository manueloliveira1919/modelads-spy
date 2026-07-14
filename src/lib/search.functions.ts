import { createServerFn } from "@tanstack/react-start";
import { classifyStatus, inferStructure } from "./offer-heuristics";
import type { OfferStatus, OfferStructure } from "./offers-shape";

export interface LiveSearchResult {
  adArchiveId: string;
  pageId: string;
  page: string;
  headline: string;
  description: string;
  activeDays: number;
  activeAds: number;
  status: OfferStatus;
  structure: OfferStructure | null;
  adSnapshotUrl: string | null;
  pageUrl: string;
  adLibraryUrl: string | null;
}

interface MetaAdItem {
  id?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
}

function computeActiveDays(start?: string): number {
  if (!start) return 0;
  const t = new Date(start).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export const searchOffersLive = createServerFn({ method: "POST" })
  .inputValidator((input: { term: string }) => ({
    term: String(input.term ?? "").trim().slice(0, 120),
  }))
  .handler(async ({ data }) => {
    const term = data.term;
    if (!term) return { results: [] as LiveSearchResult[], error: null as string | null };
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      return { results: [], error: "Token da Meta não configurado." };
    }

    const params = new URLSearchParams({
      access_token: token,
      search_terms: term,
      ad_reached_countries: JSON.stringify(["BR"]),
      ad_active_status: "ACTIVE",
      ad_type: "ALL",
      limit: "50",
      fields: [
        "id",
        "page_id",
        "page_name",
        "ad_creative_bodies",
        "ad_creative_link_titles",
        "ad_creative_link_descriptions",
        "ad_snapshot_url",
        "ad_delivery_start_time",
      ].join(","),
    });

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/ads_archive?${params.toString()}`);
      const json = (await res.json()) as {
        data?: MetaAdItem[];
        error?: { message?: string };
      };
      if (!res.ok || json.error) {
        return { results: [], error: json.error?.message ?? `Meta API ${res.status}` };
      }
      const items = json.data ?? [];

      // Conta anúncios ativos por página (a partir desta amostra).
      const perPage = new Map<string, number>();
      for (const ad of items) {
        if (!ad.page_id) continue;
        perPage.set(ad.page_id, (perPage.get(ad.page_id) ?? 0) + 1);
      }

      // 1 card por página — mantém o primeiro (que costuma ser o de maior relevância).
      const seen = new Set<string>();
      const results: LiveSearchResult[] = [];
      for (const ad of items) {
        const pageId = ad.page_id;
        const archiveId = ad.id;
        if (!pageId || !archiveId || seen.has(pageId)) continue;
        seen.add(pageId);
        const activeAds = perPage.get(pageId) ?? 1;
        const body = ad.ad_creative_bodies?.[0] ?? "";
        const title = ad.ad_creative_link_titles?.[0] ?? "";
        const desc = ad.ad_creative_link_descriptions?.[0] ?? "";
        results.push({
          adArchiveId: archiveId,
          pageId,
          page: ad.page_name ?? "Página desconhecida",
          headline: title || body.slice(0, 120),
          description: body || desc,
          activeDays: computeActiveDays(ad.ad_delivery_start_time),
          activeAds,
          status: classifyStatus(activeAds),
          structure: inferStructure(`${title} ${body}`),
          adSnapshotUrl: ad.ad_snapshot_url ?? null,
          pageUrl: `https://www.facebook.com/${pageId}`,
          adLibraryUrl: `https://www.facebook.com/ads/library/?id=${archiveId}`,
        });
      }

      results.sort((a, b) => b.activeAds - a.activeAds || b.activeDays - a.activeDays);
      return { results, error: null };
    } catch (err) {
      return { results: [], error: (err as Error).message };
    }
  });
