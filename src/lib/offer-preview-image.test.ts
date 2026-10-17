import { describe, expect, it } from "vitest";
import { allowedPreviewUrl, PREVIEW_BATCH_SIZE, PREVIEW_MAX_ATTEMPTS, PREVIEW_MAX_BYTES, snapshotImageUrls, validatePreviewImage } from "./offer-preview-image";

function png(width = 800, height = 800) {
  const bytes = new Uint8Array(128);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}

describe("creative cover safety", () => {
  it("limits each execution to ten offers", () => expect(PREVIEW_BATCH_SIZE).toBe(10));
  it("limits each offer to three attempts", () => expect(PREVIEW_MAX_ATTEMPTS).toBe(3));
  it("allows only HTTPS Meta assets, including on redirects", () => {
    expect(allowedPreviewUrl("https://scontent.xx.fbcdn.net/image.jpg").hostname).toBe("scontent.xx.fbcdn.net");
    for (const url of ["http://fbcdn.net/x", "https://127.0.0.1/x", "https://fbcdn.net.evil.test/x", "https://user:pass@facebook.com/x", "https://facebook.com:8443/x"]) {
      expect(() => allowedPreviewUrl(url)).toThrow();
    }
  });
  it("accepts a bounded raster image and rejects HTML, SVG and disguised files", () => {
    expect(validatePreviewImage(png(), "image/png").mime).toBe("image/png");
    expect(() => validatePreviewImage(png(), "image/jpeg")).toThrow();
    expect(() => validatePreviewImage(new TextEncoder().encode("<html>not an image</html>".repeat(10)), "image/png")).toThrow();
    expect(() => validatePreviewImage(new TextEncoder().encode('<svg width="800" height="800"></svg>'.repeat(10)), "image/svg+xml")).toThrow();
  });
  it("rejects images above five MiB and unreasonable dimensions", () => {
    expect(PREVIEW_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(() => validatePreviewImage(new Uint8Array(PREVIEW_MAX_BYTES + 1), "image/png")).toThrow();
    expect(() => validatePreviewImage(png(10, 10), "image/png")).toThrow();
    expect(() => validatePreviewImage(png(10000, 10000), "image/png")).toThrow();
  });
  it("prefers video thumbnails, never sales-page images", () => {
    const html = JSON.stringify({ original_image_url: "https://s.fbcdn.net/image.jpg", video_preview_image_url: "https://s.fbcdn.net/cover.jpg", thumbnail_url: "https://sales.test/cover.jpg" });
    expect(snapshotImageUrls(html, true)).toEqual(["https://s.fbcdn.net/cover.jpg", "https://s.fbcdn.net/image.jpg"]);
    expect(snapshotImageUrls(html, false)).toEqual(["https://s.fbcdn.net/image.jpg"]);
  });
});