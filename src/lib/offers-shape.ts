// Formato compartilhado entre server fn e componentes. É o que o Dashboard consome.
export type OfferStatus = "escaladissima" | "crescendo" | "testando";
export type OfferCategory = "Info" | "Nutra" | "Relacionamento" | "Finanças" | "Saúde";
export type OfferStructure = "VSL" | "Página de Vendas" | "Quiz";
export type OfferLanguage = "BR" | "Espanhol" | "Inglês";

export interface Offer {
  id: string;
  page: string;
  category: OfferCategory;
  structure: OfferStructure | null;
  language: OfferLanguage;
  status: OfferStatus;
  activeDays: number;
  activeAds: number;
  headline: string;
  description: string;
  creativeUrl: string;
  creativeType: "image" | "video";
  pageUrl: string;
  adLibraryUrl: string;
}

export const CATEGORIES: OfferCategory[] = [
  "Info",
  "Nutra",
  "Relacionamento",
  "Finanças",
  "Saúde",
];
export const STRUCTURES: OfferStructure[] = ["VSL", "Página de Vendas", "Quiz"];
export const LANGUAGES: OfferLanguage[] = ["BR", "Espanhol", "Inglês"];

const LANG_MAP: Record<string, OfferLanguage> = {
  BR: "BR",
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
}

export function rowToOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    page: row.page_name,
    category: (row.category as OfferCategory) ?? "Info",
    structure: (row.structure as OfferStructure | null) ?? null,
    language: LANG_MAP[row.language] ?? "BR",
    status: (row.status as OfferStatus) ?? "testando",
    activeDays: row.active_days,
    activeAds: row.active_ads_count,
    headline: row.headline ?? "",
    description: row.description ?? "",
    creativeUrl:
      row.creative_url ||
      "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800&auto=format&fit=crop",
    creativeType: (row.creative_type as "image" | "video") ?? "image",
    pageUrl: row.page_url ?? `https://facebook.com/${row.page_id}`,
    adLibraryUrl:
      row.ad_snapshot_url ??
      `https://www.facebook.com/ads/library/?id=${row.ad_archive_id}`,
  };
}
