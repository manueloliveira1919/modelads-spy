import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { rowToOffer, type Offer } from "./offers-shape";

function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listOffers = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverSupabase();
  // 1 card = 1 OFERTA (produto de um anunciante), nunca 1 anúncio e nunca
  // DISTINCT ON (page_id). Só ofertas qualificadas (5+ dias E 10+ anúncios
  // da mesma oferta) entram no dashboard.
  const { data, error } = await supabase.rpc("list_active_offers");

  if (error) {
    console.error("listOffers error", error);
    return { offers: [] as Offer[], error: "Não foi possível carregar ofertas." };
  }

  const rows = (data ?? []) as Parameters<typeof rowToOffer>[0][];
  // Ordena: mais anúncios da oferta primeiro, depois quem está no ar há mais tempo.
  const sorted = [...rows].sort(
    (a, b) =>
      (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0) ||
      (b.active_days ?? 0) - (a.active_days ?? 0),
  );

  return { offers: sorted.map(rowToOffer), error: null as string | null };
});

export interface OfferAd {
  id: string;
  adArchiveId: string | null;
  headline: string;
  description: string;
  creativeUrl: string | null;
  creativeType: "image" | "video";
  linkUrl: string | null;
  adStartDate: string | null;
  adLibraryUrl: string | null;
}

export const getOffer = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const [offerRes, adsRes] = await Promise.all([
      supabase.rpc("get_offer_row", { p_id: data.id }),
      supabase.rpc("list_offer_ads", { p_id: data.id }),
    ]);

    if (offerRes.error) {
      console.error("getOffer error", offerRes.error);
      return { offer: null as Offer | null, ads: [] as OfferAd[] };
    }

    const row = (offerRes.data ?? [])[0] as Parameters<typeof rowToOffer>[0] | undefined;
    const ads: OfferAd[] = ((adsRes.data ?? []) as any[]).map((a) => ({
      id: a.id,
      adArchiveId: a.ad_archive_id ?? null,
      headline: a.headline ?? "",
      description: a.description ?? "",
      creativeUrl:
        a.creative_url && !String(a.creative_url).includes("facebook.com/ads/archive/render_ad")
          ? a.creative_url
          : null,
      creativeType: (a.creative_type as "image" | "video") ?? "image",
      linkUrl: a.link_url ?? null,
      adStartDate: a.ad_start_date ?? null,
      adLibraryUrl: a.ad_archive_id
        ? `https://www.facebook.com/ads/library/?id=${a.ad_archive_id}`
        : null,
    }));

    return { offer: row ? rowToOffer(row) : null, ads };
  });

