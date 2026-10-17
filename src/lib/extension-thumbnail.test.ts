import { describe, expect, it, vi } from "vitest";
import { encode } from "jpeg-js";
import { decodeThumbnail, EXTENSION_BODY_MAX_BYTES, readExtensionBody } from "./extension-thumbnail";
import { saveExtensionThumbnails } from "./extension-thumbnail.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function jpeg(w = 600, h = 400) {
  const bytes = encode({ width: w, height: h, data: new Uint8Array(w * h * 4).fill(255) }, 80).data;
  return "data:image/jpeg;base64," + Buffer.from(bytes).toString("base64");
}
describe("extension thumbnail limits", () => {
  it("accepts a real JPEG with a 600 px largest side", () => expect(decodeThumbnail(jpeg()).length).toBeGreaterThan(128));
  it("rejects 601 px", () => expect(() => decodeThumbnail(jpeg(601))).toThrow("600 px"));
  it("rejects more than 80 KB", () => expect(() => decodeThumbnail("data:image/jpeg;base64," + "A".repeat(110000))).toThrow("80 KB"));
  it("rejects a non-image", () => expect(() => decodeThumbnail("data:image/jpeg;base64," + Buffer.from("not an image".repeat(30)).toString("base64"))).toThrow());
  it("rejects SVG", () => expect(() => decodeThumbnail("data:image/svg+xml;base64,PHN2Zz4=" )).toThrow("Formato"));
  it("rejects streamed requests over the bounded body budget", async () => {
    const r = new Request("https://app.test", { method: "POST", body: "x".repeat(EXTENSION_BODY_MAX_BYTES + 1) });
    await expect(readExtensionBody(r)).rejects.toThrow("payload_too_large");
  });
  it("accepts 50 candidates without thumbnails", async () => {
    const candidates = Array.from({ length: 50 }, (_, i) => ({ ad_archive_id: String(10000000 + i) }));
    await expect(readExtensionBody(new Request("https://app.test", { method: "POST", body: JSON.stringify({ candidates }) }))).resolves.toEqual({ candidates });
  });
});

describe("isolated thumbnail storage", () => {
  it("saves a valid asset and writes only the independent asset table", async () => {
    const writes: string[] = [];
    const upsert = vi.fn(async () => ({ error: null }));
    const upload = vi.fn(async () => ({ error: null }));
    const db = { storage: { from: () => ({ upload, getPublicUrl: () => ({ data: { publicUrl: "https://storage.test/cover.jpg" } }), remove: vi.fn() }) },
      from: (table: string) => { writes.push(table); const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: null }), upsert }; return b; },
    } as unknown as SupabaseClient<Database>;
    expect(await saveExtensionThumbnails(db, "admin", [{ ad_archive_id: "10000000", thumbnail: jpeg() }])).toEqual({ saved: 1, failed: 0, errors: [] });
    expect(upload).toHaveBeenCalledOnce(); expect(writes.every((t) => t === "extension_preview_assets")).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ status: "ok", ad_archive_id: "10000000" }));
  });
  it("a missing/corrupt thumbnail cannot overwrite a previous good cover", async () => {
    const update = vi.fn(); const upsert = vi.fn(); const upload = vi.fn();
    const db = { storage: { from: () => ({ upload, remove: vi.fn() }) },
      from: () => { const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: { status: "ok" } }), update: () => { update(); return b; }, upsert }; return b; },
    } as unknown as SupabaseClient<Database>;
    const result = await saveExtensionThumbnails(db, "admin", [{ ad_archive_id: "10000000", thumbnail_error: "cors_or_download" }]);
    expect(result.failed).toBe(1); expect(upload).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled(); expect(update).toHaveBeenCalledOnce();
  });
});