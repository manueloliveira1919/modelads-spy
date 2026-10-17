import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rowToOffer, type Offer } from "./offers-shape";

// Ofertas exigem login e plano pago: as RPCs devolvem vazio para contas free.
export const listOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  const supabase = context.supabase;
  // 1 card = 1 OFERTA (produto de um anunciante), nunca 1 anúncio e nunca
  // DISTINCT ON (page_id). Só ofertas qualificadas (5+ dias E 10+ anúncios
  // da mesma oferta) e aprovadas nos filtros de qualidade (destino próprio,
  // português, categoria oficial, sem ruído) entram no dashboard.
  const { data, error } = await supabase.rpc("list_active_offers");

  if (error) {
    console.error("listOffers error", error);
    return { offers: [] as Offer[], error: "Não foi possível carregar ofertas." };
  }

  // A ordem já vem do banco por confiança (destino, preço, estrutura, escala e
  // tempo no ar) — não reordenar por volume bruto de anúncios.
  const rows = (data ?? []) as Parameters<typeof rowToOffer>[0][];
  // Repair concurrent asset/ad-link commits without changing catalogue rows.
  for (let start = 0; start < rows.length; start += 250) {
    await supabase.rpc("reconcile_extension_previews", { p_offer_ids: rows.slice(start, start + 250).map((row) => row.id) });
  }
  const previews = rows.length ? await supabase.from("offer_previews").select("offer_id,url").eq("status", "ok").in("offer_id", rows.map((row) => row.id)) : { data: [] };
  const covers = new Map((previews.data ?? []).map((preview) => [preview.offer_id, preview.url]));
  return { offers: rows.map((row) => ({ ...rowToOffer(row), previewUrl: covers.get(row.id) ?? null })), error: null as string | null };
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
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const [offerRes, adsRes] = await Promise.all([
      supabase.rpc("get_offer_row", { p_id: data.id }),
      supabase.rpc("list_offer_ads", { p_id: data.id }),
    ]);

    if (offerRes.error) {
      console.error("getOffer error", offerRes.error);
      return { offer: null as Offer | null, ads: [] as OfferAd[] };
    }

    const row = (offerRes.data ?? [])[0] as Parameters<typeof rowToOffer>[0] | undefined;
    if (row) await supabase.rpc("reconcile_extension_previews", { p_offer_ids: [row.id] });
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

    const preview = row ? await supabase.from("offer_previews").select("url").eq("offer_id", row.id).eq("status", "ok").maybeSingle() : { data: null };
    return { offer: row ? { ...rowToOffer(row), previewUrl: preview.data?.url ?? null } : null, ads };
  });

