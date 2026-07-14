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
  active_days: number;
  active_ads_count: number;
  status: string;
  structure: string | null;
  ad_start_date?: string | null;
}

// A Meta Ads Library API pública NÃO retorna URL direta da mídia — só o
// ad_snapshot_url (uma página HTML da prévia). Tratamos a ausência da mídia
// direta como null e oferecemos o botão "Ver anúncio original" no lugar.
function resolveCreativeUrl(row: OfferRow): string | null {
  const url = row.creative_url;
  if (!url) return null;
  // Se for justamente o snapshot HTML, não serve como <img src>.
  if (url.includes("facebook.com/ads/archive/render_ad")) return null;
  return url;
}

export function rowToOffer(row: OfferRow): Offer {
  const archiveId = row.ad_archive_id?.trim() || null;
  return {
    id: row.id,
    page: row.page_name,
    category: (row.category as OfferCategory) ?? "Info",
    structure: (row.structure as OfferStructure | null) ?? null,
    language: LANG_MAP[row.language] ?? "Português",
    status: (row.status as OfferStatus) ?? "testando",
    activeDays: row.active_days,
    activeAds: row.active_ads_count,
    headline: row.headline ?? "",
    description: row.description ?? "",
    creativeUrl: resolveCreativeUrl(row),
    creativeType: (row.creative_type as "image" | "video") ?? "image",
    pageUrl: row.page_url ?? `https://facebook.com/${row.page_id}`,
    adLibraryUrl: archiveId
      ? `https://www.facebook.com/ads/library/?id=${archiveId}`
      : null,
    adSnapshotUrl: row.ad_snapshot_url ?? null,
  };
}
