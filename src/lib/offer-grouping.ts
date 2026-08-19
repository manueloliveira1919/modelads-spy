// Agrupamento de ANÚNCIOS em OFERTAS.
//
// Regra fundamental: a unidade da plataforma é a OFERTA. Um anúncio é apenas
// evidência/criativo. Anúncios só entram na mesma oferta quando representam o
// MESMO PRODUTO do MESMO anunciante. page_id sozinho NUNCA é identidade de
// oferta — um anunciante pode ter várias ofertas.
//
// Não existe teto de anúncios por oferta.

export interface GroupableAd {
  adArchiveId: string;
  pageId: string;
  pageName?: string | null;
  headline?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  adStartDate?: string | null;
}

export interface OfferGroup {
  groupKey: string;
  pageId: string;
  pageName: string | null;
  /** Título representativo do produto (o mais frequente/longo do grupo). */
  productTitle: string;
  /** Domínio + caminho normalizado do destino, quando existir. */
  landingKey: string | null;
  /** Anúncios distintos pertencentes a esta oferta. Sem limite superior. */
  ads: GroupableAd[];
  adsCount: number;
  /** Dias desde o anúncio mais antigo da oferta. */
  activeDays: number;
  firstAdStart: string | null;
}

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|ttclid|msclkid|xcod|src|sck|ref|affiliate|aff|cid|campaign|adset|ad_id|_ga|mc_|s1|s2|s3|sub_?id)/i;

/** Domínio + caminho, sem parâmetros de tracking. Sinal mais forte de "mesmo produto". */
export function normalizeLink(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value.replace(/^\/+/, "")}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host || host === "facebook.com" || host === "m.facebook.com") return null;

  const path = url.pathname.replace(/\/+$/, "").toLowerCase();

  // Parâmetros que não são tracking podem identificar o produto (ex.: ?produto=x).
  const kept: string[] = [];
  url.searchParams.forEach((v, k) => {
    if (TRACKING_PARAMS.test(k)) return;
    if (!v) return;
    kept.push(`${k.toLowerCase()}=${v.toLowerCase()}`);
  });
  kept.sort();

  // Links de WhatsApp/Messenger: o número/destino é a identidade.
  if (/(^|\.)(wa\.me|whatsapp\.com|api\.whatsapp\.com|m\.me)$/.test(host)) {
    const phone = url.searchParams.get("phone") ?? path.replace(/^\//, "");
    return `${host}/${phone}`.toLowerCase();
  }

  return kept.length ? `${host}${path}?${kept.join("&")}` : `${host}${path}`;
}

const STOP_WORDS = new Set([
  "de","da","do","das","dos","a","o","as","os","e","em","para","por","com","um","uma","no","na",
  "nos","nas","que","seu","sua","the","of","to","and","for","your","you","is","it","this","my",
]);

/** Título sem emoji/pontuação/acentos/caixa — pega criativos que só mudam a arte. */
export function normalizeTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(raw: string | null | undefined): string[] {
  return normalizeTitle(raw)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

/** Jaccard sobre tokens significativos do título. */
export function titleSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const setA = new Set(titleTokens(a));
  const setB = new Set(titleTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

export const SIMILARITY_THRESHOLD = 0.72;

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

interface Bucket {
  pageId: string;
  pageName: string | null;
  landingKey: string | null;
  titleKey: string;
  ads: GroupableAd[];
}

/**
 * Agrupa anúncios em ofertas. A cascata (sempre DENTRO do mesmo page_id):
 *  1. mesmo destino normalizado;
 *  2. mesmo título normalizado;
 *  3. alta similaridade de título;
 *  4. nenhum dos três -> oferta própria (nunca é forçado para dentro de outra).
 */
export function groupAdsIntoOffers(ads: GroupableAd[]): OfferGroup[] {
  const byPage = new Map<string, GroupableAd[]>();
  for (const ad of ads) {
    if (!ad.pageId) continue;
    const list = byPage.get(ad.pageId);
    if (list) list.push(ad);
    else byPage.set(ad.pageId, [ad]);
  }

  const groups: OfferGroup[] = [];

  for (const [pageId, pageAds] of byPage) {
    const buckets: Bucket[] = [];
    const seenAdIds = new Set<string>();

    // Anúncios com título mais longo primeiro: âncora de grupo mais informativa.
    const ordered = [...pageAds].sort(
      (a, b) => (b.headline?.length ?? 0) - (a.headline?.length ?? 0),
    );

    for (const ad of ordered) {
      if (seenAdIds.has(ad.adArchiveId)) continue; // mesmo criativo não conta duas vezes
      seenAdIds.add(ad.adArchiveId);

      const landingKey = normalizeLink(ad.linkUrl);
      const titleKey = normalizeTitle(ad.headline);

      let target: Bucket | undefined;

      // 1. mesmo destino
      if (landingKey) {
        target = buckets.find((b) => b.landingKey && b.landingKey === landingKey);
      }
      // 2. mesmo título normalizado (só agrupa se os destinos não se contradizem)
      if (!target && titleKey) {
        target = buckets.find(
          (b) =>
            b.titleKey === titleKey &&
            (!landingKey || !b.landingKey || b.landingKey === landingKey),
        );
      }
      // 3. alta similaridade de título
      if (!target && titleKey) {
        target = buckets.find(
          (b) =>
            (!landingKey || !b.landingKey || b.landingKey === landingKey) &&
            titleSimilarity(b.titleKey, titleKey) >= SIMILARITY_THRESHOLD,
        );
      }

      if (target) {
        target.ads.push(ad);
        if (!target.landingKey && landingKey) target.landingKey = landingKey;
      } else {
        // 4. oferta própria
        buckets.push({
          pageId,
          pageName: ad.pageName ?? null,
          landingKey,
          titleKey,
          ads: [ad],
        });
      }
    }

    for (const bucket of buckets) {
      const starts = bucket.ads
        .map((a) => a.adStartDate)
        .filter((d): d is string => !!d)
        .sort();
      const firstAdStart = starts[0] ?? null;
      const productTitle =
        bucket.ads
          .map((a) => (a.headline ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)[0] ?? "Sem título";

      groups.push({
        groupKey: buildGroupKey({
          pageId: bucket.pageId,
          landingKey: bucket.landingKey,
          titleKey: bucket.titleKey,
        }),
        pageId: bucket.pageId,
        pageName: bucket.pageName,
        productTitle,
        landingKey: bucket.landingKey,
        ads: bucket.ads,
        adsCount: bucket.ads.length, // sem teto
        activeDays: daysSince(firstAdStart),
        firstAdStart,
      });
    }
  }

  return groups;
}

export function buildGroupKey(input: {
  pageId: string;
  landingKey: string | null;
  titleKey: string;
}): string {
  const identity = input.landingKey ?? input.titleKey.slice(0, 120) ?? "";
  return `${input.pageId}::${identity}`;
}

// ---------- Qualificação (critério inalterado, agora no nível da OFERTA) ----------

export const MIN_OFFER_DAYS = 5;
export const MIN_OFFER_ADS = 10;

export type OfferRejectReason = "poucos_dias" | "poucos_anuncios" | "dias_e_anuncios";

/** 5+ dias E 10+ anúncios DA MESMA OFERTA. Nunca usa contagem da página. */
export function qualifyOffer(group: Pick<OfferGroup, "activeDays" | "adsCount">): {
  qualified: boolean;
  reason: OfferRejectReason | null;
} {
  const daysOk = group.activeDays >= MIN_OFFER_DAYS;
  const adsOk = group.adsCount >= MIN_OFFER_ADS;
  if (daysOk && adsOk) return { qualified: true, reason: null };
  if (!daysOk && !adsOk) return { qualified: false, reason: "dias_e_anuncios" };
  return { qualified: false, reason: daysOk ? "poucos_anuncios" : "poucos_dias" };
}
