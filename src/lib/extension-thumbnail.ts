import { decode } from "jpeg-js";
import { imageSize } from "image-size";

export const THUMBNAIL_MAX_BYTES = 80 * 1024;
export const EXTENSION_BODY_MAX_BYTES = 1500 * 1024;
export function decodeThumbnail(value: string) {
  if (!value.startsWith("data:image/jpeg;base64,")) throw new Error("Formato da miniatura inválido");
  const encoded = value.slice(23);
  if (encoded.length > Math.ceil(THUMBNAIL_MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("Miniatura excede 80 KB ou contém dados inválidos");
  }
  const raw = atob(encoded);
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  if (bytes.length < 128 || bytes.length > THUMBNAIL_MAX_BYTES) throw new Error("Tamanho da miniatura inválido");
  const info = imageSize(bytes);
  if (info.type !== "jpg" || !info.width || !info.height || info.width > 600 || info.height > 600) {
    throw new Error("Miniatura deve ser JPEG de até 600 px");
  }
  // Decode the actual pixels: signatures/headers alone are not sufficient.
  decode(bytes, { useTArray: true, formatAsRGBA: false, tolerantDecoding: false, maxResolutionInMP: 1, maxMemoryUsageInMB: 16 });
  return bytes;
}

export async function readExtensionBody(request: Request) {
  if (Number(request.headers.get("content-length")) > EXTENSION_BODY_MAX_BYTES) throw new Error("payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > EXTENSION_BODY_MAX_BYTES) { await reader.cancel(); throw new Error("payload_too_large"); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}