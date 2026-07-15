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
  // Dedup por page_id direto no banco (DISTINCT ON) — garante 1 linha por
  // anunciante já escolhendo o melhor anúncio, sem depender de LIMIT arbitrário.
  const { data, error } = await supabase.rpc("list_active_offer_pages");

  if (error) {
    console.error("listOffers error", error);
    return { offers: [] as Offer[], error: "Não foi possível carregar ofertas." };
  }

  const rows = (data ?? []) as Parameters<typeof rowToOffer>[0][];
  // Ordena: mais anúncios ativos primeiro, depois quem está no ar há mais tempo.
  const sorted = [...rows].sort(
    (a, b) =>
      (b.active_ads_count ?? 0) - (a.active_ads_count ?? 0) ||
      (b.active_days ?? 0) - (a.active_days ?? 0),
  );

  return { offers: sorted.map(rowToOffer), error: null as string | null };
});

export const getOffer = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();
    const { data: row, error } = await supabase
      .from("meta_offers")
      .select(
        "id, ad_archive_id, page_id, page_name, category, language, headline, description, creative_url, creative_type, ad_snapshot_url, page_url, link_url, active_days, active_ads_count, status, structure, product_type, ad_start_date",
      )

      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("getOffer error", error);
      return { offer: null as Offer | null };
    }
    return { offer: row ? rowToOffer(row) : null };
  });
