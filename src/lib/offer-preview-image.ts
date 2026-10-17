import { imageSize } from "image-size";

export const PREVIEW_BATCH_SIZE = 10;
export const PREVIEW_MAX_ATTEMPTS = 3;
export const PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

export function allowedPreviewUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
    !(host === "facebook.com" || host.endsWith(".facebook.com") ||
      host === "fbcdn.net" || host.endsWith(".fbcdn.net"))) {
    throw new Error("Origem de imagem não permitida");
  }
  return url;
}

export function validatePreviewImage(bytes: Uint8Array, contentType: string) {
  if (bytes.length < 128 || bytes.length > PREVIEW_MAX_BYTES) throw new Error("Tamanho de imagem inválido");
  const info = imageSize(bytes);
  const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  const mime = info.type ? types[info.type] : undefined;
  if (!mime || contentType.split(";")[0]?.trim().toLowerCase() !== mime) throw new Error("Arquivo não é uma imagem permitida");
  if (!info.width || !info.height || info.width < 100 || info.height < 100 ||
    info.width > 12000 || info.height > 12000 || info.width * info.height > 40_000_000) {
    throw new Error("Dimensões de imagem inválidas");
  }
  return { mime, extension: info.type === "jpg" ? "jpg" : info.type };
}

/** Data only: ad snapshot thumbnails, never landing-page images or scripts. */
export function snapshotImageUrls(html: string, video: boolean): string[] {
  const keys = video
    ? ["video_preview_image_url", "video_thumbnail_url", "thumbnail_url", "original_image_url", "resized_image_url", "image_url"]
    : ["original_image_url", "resized_image_url", "image_url"];
  const found: string[] = [];
  for (const key of keys) {
    const rx = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])+)"`, "g");
    for (const match of html.matchAll(rx)) {
      try {
        const url = JSON.parse(`"${match[1]}"`) as string;
        allowedPreviewUrl(url);
        if (!found.includes(url)) found.push(url);
      } catch { /* Ignore malformed or non-Meta URLs. */ }
    }
  }
  return found.slice(0, 5);
}