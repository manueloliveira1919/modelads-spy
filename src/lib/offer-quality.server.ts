// Motor da auditoria de qualidade comercial — somente leitura (dryRun).
// Lê as evidências via RPC e classifica em TS puro. NÃO escreve nada no banco.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyOfferQuality,
  type CommercialQuality,
  type OfferAdEvidence,
} from "./offer-commercial-quality";

interface SnapshotRow {
  id: string;
  page_name: string | null;
  product_title: string | null;
  landing_key: string | null;
  category: string | null;
  language: string | null;
  ads_count: number;
  active_days: number;
  visible: boolean;
  qualified: boolean;
  ads:
    | { headline: string | null; description: string | null; link_url: string | null }[]
    | null;
}

export interface OfferQualityExample {
  id: string;
  pageName: string | null;
  productTitle: string | null;
  category: string | null;
  adsCount: number;
  activeDays: number;
  visible: boolean;
  qualified: boolean;
  quality: CommercialQuality | null;
  reasons: string[];
}

export interface QualityDryRunReport {
  totalAnalyzed: number;
  commercial: number;
  suspicious: number;
  entertainment: number;
  notAnalyzed: number;
  visibleBreakdown: {
    total: number;
    commercial: number;
    suspicious: number;
    entertainment: number;
    notAnalyzed: number;
  };
  topReasons: { reason: string; count: number }[];
  examples: OfferQualityExample[];
}

const SNAPSHOT_CHUNK = 200;
const IDS_PAGE = 1000;

export async function runQualityDryRun(
  admin: SupabaseClient,
): Promise<QualityDryRunReport> {
  // 1) Todos os ids de ofertas (paginado).
  const ids: string[] = [];
  for (let from = 0; ; from += IDS_PAGE) {
    const { data, error } = await admin
      .from("offers")
      .select("id")
      .order("id")
      .range(from, from + IDS_PAGE - 1);
    if (error) throw new Error(`snapshot ids: ${error.message}`);
    for (const row of data ?? []) ids.push((row as { id: string }).id);
    if (!data || data.length < IDS_PAGE) break;
  }

  // 2) Snapshot em lotes + classificação.
  const counts = { commercial: 0, suspicious: 0, entertainment: 0, notAnalyzed: 0 };
  const visibleCounts = { commercial: 0, suspicious: 0, entertainment: 0, notAnalyzed: 0 };
  let visibleTotal = 0;
  const reasonCounts = new Map<string, number>();
  const examples: OfferQualityExample[] = [];

  for (let i = 0; i < ids.length; i += SNAPSHOT_CHUNK) {
    const chunk = ids.slice(i, i + SNAPSHOT_CHUNK);
    const { data, error } = await admin.rpc("offers_quality_snapshot", {
      p_ids: chunk,
    });
    if (error) throw new Error(`snapshot rpc: ${error.message}`);

    for (const row of (data ?? []) as unknown as SnapshotRow[]) {
      const ads: OfferAdEvidence[] = (row.ads ?? []).map((a) => ({
        headline: a.headline,
        description: a.description,
        linkUrl: a.link_url,
      }));
      const result = classifyOfferQuality({
        pageName: row.page_name,
        productTitle: row.product_title,
        landingKey: row.landing_key,
        category: row.category,
        language: row.language,
        adsCount: row.ads_count,
        activeDays: row.active_days,
        ads,
      });

      const key =
        result.quality === null
          ? "notAnalyzed"
          : result.quality === "commercial"
            ? "commercial"
            : result.quality === "suspicious"
              ? "suspicious"
              : "entertainment";
      counts[key] += 1;
      if (row.visible && row.qualified) {
        visibleTotal += 1;
        visibleCounts[key] += 1;
      }
      for (const reason of result.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
      if (result.quality !== "commercial" || examples.length < 5000) {
        examples.push({
          id: row.id,
          pageName: row.page_name,
          productTitle: row.product_title,
          category: row.category,
          adsCount: row.ads_count,
          activeDays: row.active_days,
          visible: row.visible,
          qualified: row.qualified,
          quality: result.quality,
          reasons: result.reasons,
        });
      }
    }
  }

  const topReasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  return {
    totalAnalyzed: ids.length,
    commercial: counts.commercial,
    suspicious: counts.suspicious,
    entertainment: counts.entertainment,
    notAnalyzed: counts.notAnalyzed,
    visibleBreakdown: { total: visibleTotal, ...visibleCounts },
    topReasons,
    examples,
  };
}
