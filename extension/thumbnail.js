// Shared with the MV3 service worker. Never downloads videos or arbitrary hosts.
function mdlCreativeUrl(value) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.port ||
      !(u.hostname === "fbcdn.net" || u.hostname.endsWith(".fbcdn.net"))) throw new Error("cors_or_download");
  return u.href;
}

async function mdlFetchCreative(url) {
  let current = mdlCreativeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(current, { signal: controller.signal, credentials: "omit", redirect: "error" });
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)(;|$)/i.test(r.headers.get("content-type") || "")) throw new Error("cors_or_download");
    if (Number(r.headers.get("content-length")) > 5 * 1024 * 1024) throw new Error("too_large");
    const reader = r.body?.getReader();
    if (!reader) throw new Error("cors_or_download");
    const chunks = []; let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); throw new Error("too_large"); }
      chunks.push(part.value);
    }
    return new Blob(chunks, { type: r.headers.get("content-type").split(";")[0] });
  } finally { clearTimeout(timer); }
}

async function mdlEncodeThumbnail(source) {
  const width = source.naturalWidth || source.videoWidth || source.width;
  const height = source.naturalHeight || source.videoHeight || source.height;
  if (!width || !height || width * height > 40_000_000) throw new Error("encode_failed");
  for (const side of [600, 480, 360]) {
    const ratio = Math.min(1, side / Math.max(width, height));
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    const canvas = typeof document === "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("encode_failed");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    for (const quality of [0.8, 0.65, 0.5]) {
      const blob = canvas.convertToBlob ? await canvas.convertToBlob({ type: "image/jpeg", quality })
        : await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("encode_failed");
      if (blob.size > 80 * 1024) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return "data:image/jpeg;base64," + btoa(binary);
    }
  }
  throw new Error("too_large");
}

async function mdlBlobThumbnail(blob) {
  const bitmap = await createImageBitmap(blob);
  try { return await mdlEncodeThumbnail(bitmap); } finally { bitmap.close(); }
}

async function mdlCaptureThumbnail(url, source) {
  if (!url && !source) return { thumbnail_error: "no_creative" };
  if (source) {
    try { return { thumbnail: await mdlEncodeThumbnail(source) }; } catch { /* Tainted canvas: fetch below. */ }
  }
  try { return { thumbnail: await mdlBlobThumbnail(await mdlFetchCreative(url)) }; }
  catch { /* fbcdn needs the extension host permission instead of page CORS. */ }
  try {
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ thumbnail_error: "cors_or_download" }), 12000);
      chrome.runtime.sendMessage({ type: "mdl_thumbnail", url }, (result) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError || !result) resolve({ thumbnail_error: "cors_or_download" });
        else resolve(result);
      });
    });
  } catch { return { thumbnail_error: "cors_or_download" }; }
}