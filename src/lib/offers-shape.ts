// Formato compartilhado entre server fn e componentes. É o que o Dashboard consome.
import { inferProductType, isWhatsappFunnel, type ProductType } from "./offer-heuristics";
export type { ProductType } from "./offer-heuristics";
export { PRODUCT_TYPES } from "./offer-heuristics";

export type OfferStatus = "escaladissimo" | "escalado" | "testando";

// Valores legados gravados no banco continuam sendo lidos sem quebrar.
const LEGACY_STATUS: Record<string, OfferStatus> = {
  escaladissima: "escaladissimo",
  escaladissimo: "escaladissimo",
  escalando: "escalado",
  escalado: "escalado",
  crescendo: "testando",
  testando: "testando",
};

export function normalizeStatus(value: string | null | undefined): OfferStatus {
  return LEGACY_STATUS[(value ?? "").toLowerCase()] ?? "testando";
}
// As categorias são cadastradas no painel admin (tabela keyword_categories),
// por isso aqui é apenas texto livre — nada fixo no código.
export type OfferCategory = string;
export type OfferStructure = "VSL" | "Página de Vendas" | "Quiz";
export type OfferLanguage = "Português" | "Espanhol" | "Inglês";



// Estrutura vinda da leitura real da página de destino (mais confiável que a
// inferida pelo texto do anúncio). "WhatsApp" só existe nesse campo.
export type LandingStructure = "VSL" | "Quiz" | "Página de Vendas" | "WhatsApp";

const LANDING_STRUCTURES: LandingStructure[] = ["VSL", "Quiz", "Página de Vendas", "WhatsApp"];

export interface Offer {
  id: string;
  page: string;
  pageId: string;
  category: OfferCategory;
  structure: OfferStructure | null;
  language: OfferLanguage;
  status: OfferStatus;
  productType: ProductType;
  isWhatsapp: boolean;
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
  // Dados da análise da página de destino real (landing_*), preenchidos aos
  // poucos pelo worker — podem ser null enquanto a checagem não passa.
  landingPrice: string | null;
  landingStructure: LandingStructure | null;
  landingValidated: boolean | null;
}

// Converte o texto de preço ("R$ 97", "R$ 1.997,00") em número para filtros.
export function parsePriceBRL(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}



// A lista de categorias vem do banco (hook useActiveCategoryNames).


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
  product_type?: string | null;
  ad_start_date?: string | null;
  landing_price?: string | null;
  landing_structure?: string | null;
  landing_validated?: boolean | null;
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
  const headline = row.headline ?? "";
  const description = row.description ?? "";
  const productType = (row.product_type as ProductType | null | undefined)
    ?? inferProductType(`${headline} ${description}`);
  return {
    id: row.id,
    page: row.page_name,
    pageId: row.page_id,
    category: row.category || "Sem categoria",
    structure: (row.structure as OfferStructure | null) ?? null,
    language: LANG_MAP[row.language] ?? "Português",
    status: normalizeStatus(row.status),
    productType,
    isWhatsapp: isWhatsappFunnel(`${headline} ${description}`, row.link_url ?? null),

    activeDays: computeActiveDaysFromStart(row.ad_start_date, row.active_days ?? 0),
    activeAds: row.active_ads_count,
    headline,
    description,

    creativeUrl: resolveCreativeUrl(row),
    creativeType: (row.creative_type as "image" | "video") ?? "image",
    pageUrl: row.page_url ?? `https://www.facebook.com/${row.page_id}`,
    linkUrl: row.link_url ?? null,
    adLibraryUrl: archiveId
      ? `https://www.facebook.com/ads/library/?id=${archiveId}`
      : null,
    adSnapshotUrl: row.ad_snapshot_url ?? null,
    adArchiveId: archiveId,
    landingPrice: row.landing_price ?? null,
    landingStructure:
      row.landing_structure && LANDING_STRUCTURES.includes(row.landing_structure as LandingStructure)
        ? (row.landing_structure as LandingStructure)
        : null,
    landingValidated: row.landing_validated ?? null,
  };
}

