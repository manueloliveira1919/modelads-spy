// Formato compartilhado entre server fn e componentes. É o que o Dashboard consome.
export type OfferStatus = "escaladissima" | "crescendo" | "testando";
export type OfferCategory = "Info" | "Nutra" | "Relacionamento" | "Finanças" | "Saúde";
export type OfferStructure = "VSL" | "Página de Vendas" | "Quiz";
export type OfferLanguage = "Português" | "Espanhol" | "Inglês";

export interface Offer {
  id: string;
  page: string;
  pageId: string;
  category: OfferCategory;
  structure: OfferStructure | null;
  language: OfferLanguage;
  status: OfferStatus;
  activeDays: number;
  activeAds: number;
  headline: string;
  description: string;
  creativeUrl: string | null;
  creativeType: "image" | "video";
  pageUrl: string;
  linkUrl: string | null;
  adLibraryUrl: string | null;
  adSnapshotUrl: string | null;
  adArchiveId: string | null;
}


export const CATEGORIES: OfferCategory[] = [
  "Info",
  "Nutra",
  "Relacionamento",
  "Finanças",
  "Saúde",
];
export const STRUCTURES: OfferStructure[] = ["VSL", "Página de Vendas", "Quiz"];
export const LANGUAGES: OfferLanguage[] = ["Português", "Espanhol", "Inglês"];

const LANG_MAP: Record<string, OfferLanguage> = {
  BR: "Português",
  PT: "Português",
  ES: "Espanhol",
  EN: "Inglês",
};

interface OfferRow {
  id: string;
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  category: string;
  language: string;
  headline: string | null;
  description: string | null;
  creative_url: string | null;
  creative_type: string;
  ad_snapshot_url: string | null;
  page_url: string | null;
  link_url?: string | null;
  active_days: number;
  active_ads_count: number;
  status: string;
  structure: string | null;
  ad_start_date?: string | null;
}

function resolveCreativeUrl(row: OfferRow): string | null {
  const url = row.creative_url;
  if (!url) return null;
  // Se por algum motivo salvamos o snapshot HTML aqui, não serve como <img src>.
  if (url.includes("facebook.com/ads/archive/render_ad")) return null;
  return url;
}

function computeActiveDaysFromStart(start: string | null | undefined, fallback: number): number {
  if (!start) return fallback;
  const t = new Date(start).getTime();
  if (Number.isNaN(t)) return fallback;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export function rowToOffer(row: OfferRow): Offer {
  const archiveId = row.ad_archive_id?.trim() || null;
  return {
    id: row.id,
    page: row.page_name,
    pageId: row.page_id,
    category: (row.category as OfferCategory) ?? "Info",
    structure: (row.structure as OfferStructure | null) ?? null,
    language: LANG_MAP[row.language] ?? "Português",
    status: (row.status as OfferStatus) ?? "testando",
    activeDays: computeActiveDaysFromStart(row.ad_start_date, row.active_days ?? 0),
    activeAds: row.active_ads_count,
    headline: row.headline ?? "",
    description: row.description ?? "",
    creativeUrl: resolveCreativeUrl(row),
    creativeType: (row.creative_type as "image" | "video") ?? "image",
    pageUrl: row.page_url ?? `https://www.facebook.com/${row.page_id}`,
    linkUrl: row.link_url ?? null,
    adLibraryUrl: archiveId
      ? `https://www.facebook.com/ads/library/?id=${archiveId}`
      : null,
    adSnapshotUrl: row.ad_snapshot_url ?? null,
    adArchiveId: archiveId,
  };
}

