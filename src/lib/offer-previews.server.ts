import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchMeta, META_API } from "./meta-mining.server";
import { allowedPreviewUrl, PREVIEW_MAX_BYTES, snapshotImageUrls, validatePreviewImage } from "./offer-preview-image";

const BUCKET = "offer-previews";

// Stored snapshot URLs expire. As a last resort, ask the Ad Library API for a
// fresh snapshot URL of any ad from the offer's page (read-only lookup; the
// mining pipeline itself is untouched).
async function freshSnapshotUrl(pageId: string): Promise<string | null> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || !pageId) return null;
  const params = new URLSearchParams({
    access_token: token,
    search_page_ids: JSON.stringify([pageId]),
    ad_reached_countries: JSON.stringify(["ALL"]),
    ad_active_status: "ALL",
    ad_type: "ALL",
    limit: "5",
    fields: "id,ad_snapshot_url",
  });
  try {
    const json = await fetchMeta(`${META_API}?${params.toString()}`);
    const rows = (json as { data?: { ad_snapshot_url?: string }[] }).data ?? [];
    for (const row of rows) if (row.ad_snapshot_url) return row.ad_snapshot_url;
  } catch { /* Fresh lookup is best-effort; stale sources already failed. */ }
  return null;
}

async function download(url: string, maxBytes: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let current = allowedPreviewUrl(url);
    for (let redirect = 0; redirect <= 3; redirect++) {
      const response = await fetch(current, { signal: controller.signal, redirect: "manual", headers: {
        "User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR,pt;q=0.9",
      } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirecionamento sem destino");
        current = allowedPreviewUrl(new URL(location, current).href);
        await response.body?.cancel();
        continue;
      }
      if (!response.ok || !response.body) throw new Error(`Mídia indisponível (HTTP ${response.status})`);
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body.cancel();
        throw new Error("Arquivo muito grande");
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > maxBytes) { await reader.cancel(); throw new Error("Arquivo muito grande"); }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return { bytes, contentType: response.headers.get("content-type") ?? "" };
    }
    throw new Error("Redirecionamentos excessivos");
  } finally { clearTimeout(timer); }
}

export async function generateOfferPreviews(db: SupabaseClient<Database>) {
  // Never spend retries when storage has not been enabled by the workspace.
  const { data: bucket, error: bucketError } = await db.storage.getBucket(BUCKET);
  if (bucketError || !bucket?.public) return {
    ok: false as const, message: "Libere buckets públicos em Settings → Privacy & Security e solicite a ativação do armazenamento de capas.",
    processed: 0, saved: 0, failed: 0,
  };
  const claim = await db.rpc("claim_offer_previews");
  if (claim.error) throw new Error("Não foi possível reservar as capas pendentes");
  const rows = claim.data ?? [];
  let saved = 0;
  let failed = 0;
  // Two at a time; ten total, independent of any mining run.
  for (let start = 0; start < rows.length; start += 2) {
    await Promise.all(rows.slice(start, start + 2).map(async (row) => {
      try {
        const ads = await db.from("meta_offers")
          .select("ad_archive_id,creative_url,creative_type,ad_snapshot_url")
          .eq("offer_id", row.offer_id)
          .order("creative_url", { nullsFirst: false })
          .order("ad_start_date", { ascending: false, nullsFirst: false }).limit(3);
        if (ads.error) throw new Error("Não foi possível ler o criativo");
        let image: Awaited<ReturnType<typeof download>> | undefined;
        let adId: string | undefined;
        let format: ReturnType<typeof validatePreviewImage> | undefined;
        for (const ad of ads.data ?? []) {
          const urls: string[] = [];
          if (ad.creative_url && !ad.creative_url.includes("/ads/archive/") && ad.creative_type !== "video") urls.push(ad.creative_url);
          // Temporary snapshots, if still present, can contain a separate video cover.
          const snapshots = await db.from("meta_refresh_snapshots").select("image_url")
            .eq("ad_archive_id", ad.ad_archive_id).not("image_url", "is", null)
            .order("created_at", { ascending: false }).limit(1);
          if (snapshots.data?.[0]?.image_url) urls.push(snapshots.data[0].image_url);
          for (const url of urls) {
            try { const file = await download(url, PREVIEW_MAX_BYTES); format = validatePreviewImage(file.bytes, file.contentType); image = file; break; }
            catch { /* Expired asset: read only the existing ad snapshot below. */ }
          }
          if (!image && ad.ad_snapshot_url) {
            try {
              const snapshot = await download(ad.ad_snapshot_url, 2 * 1024 * 1024);
              const candidates = snapshotImageUrls(new TextDecoder().decode(snapshot.bytes), ad.creative_type === "video");
              for (const url of candidates.slice(0, 2)) {
                try { const file = await download(url, PREVIEW_MAX_BYTES); format = validatePreviewImage(file.bytes, file.contentType); image = file; break; }
                catch { /* Try next thumbnail. */ }
              }
            } catch { /* Try next existing ad, never a sales page. */ }
          }
          if (image) { adId = ad.ad_archive_id; break; }
        }
        if (!image || !format) throw new Error("Nenhuma imagem ou capa de vídeo disponível no anúncio");
        // Claim-specific path prevents stale workers overwriting a newer attempt.
        const path = `${row.offer_id}/${row.claim_token}.${format.extension}`;
        const uploaded = await db.storage.from(BUCKET).upload(path, image.bytes, { contentType: format.mime, cacheControl: "31536000", upsert: false });
        if (uploaded.error) throw new Error("Falha ao salvar a imagem");
        const { data } = db.storage.from(BUCKET).getPublicUrl(path);
        const completed = await db.from("offer_previews").update({ url: data.publicUrl, status: "ok", source_ad_id: adId,
          claim_token: null, claimed_at: null, last_error: null, updated_at: new Date().toISOString(),
        }).eq("offer_id", row.offer_id).eq("claim_token", row.claim_token ?? "").select("offer_id");
        if (completed.error || !completed.data?.length) {
          await db.storage.from(BUCKET).remove([path]);
          throw new Error("Reserva da capa expirou");
        }
        saved++;
      } catch (error) {
        failed++;
        // Never persist provider URLs/tokens or raw provider error messages.
        const message = error instanceof Error && /^(Nenhuma imagem|Falha ao salvar|Reserva da capa|Não foi possível ler)/.test(error.message)
          ? error.message : "Não foi possível obter uma imagem válida";
        const result = await db.from("offer_previews").update({ status: "failed", claim_token: null, claimed_at: null,
          last_error: message, next_attempt_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString(),
        }).eq("offer_id", row.offer_id).eq("claim_token", row.claim_token ?? "");
        if (result.error) console.error("Preview failure could not be recorded", row.offer_id);
      }
    }));
  }
  return { ok: true as const, processed: rows.length, saved, failed };
}