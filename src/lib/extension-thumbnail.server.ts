import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { decodeThumbnail } from "./extension-thumbnail";

type ThumbnailCandidate = { ad_archive_id: string; thumbnail?: string | null; thumbnail_error?: string | null };
export async function saveExtensionThumbnails(db: SupabaseClient<Database>, userId: string, rows: ThumbnailCandidate[]) {
  let saved = 0, failed = 0;
  const errors: { ad_archive_id: string; message: string }[] = [];
  for (const row of rows) {
    if (!row.thumbnail && !row.thumbnail_error) continue;
    let path: string | undefined;
    try {
      if (!row.thumbnail) throw new Error("Miniatura indisponível no navegador");
      const bytes = decodeThumbnail(row.thumbnail);
      path = `extension/${row.ad_archive_id}/${crypto.randomUUID()}.jpg`;
      const upload = await db.storage.from("offer-previews").upload(path, bytes, {
        contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
      });
      if (upload.error) throw new Error("Falha ao salvar miniatura");
      const { data } = db.storage.from("offer-previews").getPublicUrl(path);
      // The isolated trigger links this asset to every existing offer for this ad.
      const write = await db.from("extension_preview_assets").upsert({ ad_archive_id: row.ad_archive_id,
        submitted_by: userId, url: data.publicUrl, status: "ok", last_error: null, updated_at: new Date().toISOString(),
      });
      if (write.error) throw new Error("Falha ao associar miniatura");
      saved++;
    } catch (error) {
      if (path) await db.storage.from("offer-previews").remove([path]);
      const message = error instanceof Error && /^(Formato|Miniatura|Tamanho|Falha)/.test(error.message)
        ? error.message : "Imagem inválida ou incompleta";
      const previous = await db.from("extension_preview_assets").select("status").eq("ad_archive_id", row.ad_archive_id).maybeSingle();
      if (previous.data?.status === "ok") {
        await db.from("extension_preview_assets").update({ last_error: message }).eq("ad_archive_id", row.ad_archive_id);
      } else {
        await db.from("extension_preview_assets").upsert({ ad_archive_id: row.ad_archive_id,
          submitted_by: userId, status: "failed", last_error: row.thumbnail_error && !row.thumbnail ? row.thumbnail_error : message,
        });
      }
      errors.push({ ad_archive_id: row.ad_archive_id, message }); failed++;
    }
  }
  return { saved, failed, errors };
}