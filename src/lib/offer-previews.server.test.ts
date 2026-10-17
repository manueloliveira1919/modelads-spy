import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateOfferPreviews } from "./offer-previews.server";

function fixture(publicBucket: boolean, withImage: boolean) {
  const writes: { table: string; data: Record<string, unknown> }[] = [];
  const claimed = { offer_id: "offer-1", claim_token: "claim-1", attempts: 1 };
  const upload = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({ data: [claimed], error: null }));
  const db = {
    rpc,
    storage: {
      getBucket: vi.fn(async () => ({ data: { public: publicBucket }, error: null })),
      from: () => ({ upload, remove: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "https://project.test/cover.png" } }) }),
    },
    from: (table: string) => {
      let update = false;
      const response = () => ({ error: null, data: update ? [{ offer_id: claimed.offer_id }]
        : table === "meta_offers" && withImage ? [{ ad_archive_id: "ad-1", creative_url: "https://s.fbcdn.net/cover.png", creative_type: "image", ad_snapshot_url: null }] : [] });
      const builder = {
        select: () => builder, eq: () => builder, order: () => builder, limit: () => builder, not: () => builder,
        update: (data: Record<string, unknown>) => { update = true; writes.push({ table, data }); return builder; },
        then: (resolve: (value: ReturnType<typeof response>) => unknown) => Promise.resolve(response()).then(resolve),
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient<Database>, rpc, upload, writes };
}

afterEach(() => vi.unstubAllGlobals());

describe("isolated offer cover processing", () => {
  it("does not claim or spend attempts when public storage is blocked", async () => {
    const f = fixture(false, true);
    const result = await generateOfferPreviews(f.db);
    expect(result.ok).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
    expect(f.upload).not.toHaveBeenCalled();
    expect(f.writes).toEqual([]);
  });
  it("copies a valid creative and writes only to the independent preview table", async () => {
    const bytes = new Uint8Array(128);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); bytes.set([73, 72, 68, 82], 12);
    new DataView(bytes.buffer).setUint32(16, 800); new DataView(bytes.buffer).setUint32(20, 800);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { headers: { "content-type": "image/png" } })));
    const f = fixture(true, true);
    const result = await generateOfferPreviews(f.db);
    expect(result).toEqual({ ok: true, processed: 1, saved: 1, failed: 0 });
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("claim_offer_previews");
    expect(f.upload.mock.calls[0]?.[0]).toBe("offer-1/claim-1.png");
    expect(f.writes).toEqual([{ table: "offer_previews", data: expect.objectContaining({ status: "ok", url: "https://project.test/cover.png", source_ad_id: "ad-1" }) }]);
  });
  it("records failure and a future retry without changing offers or mining", async () => {
    const f = fixture(true, false);
    const before = Date.now();
    const result = await generateOfferPreviews(f.db);
    expect(result).toEqual({ ok: true, processed: 1, saved: 0, failed: 1 });
    expect(f.upload).not.toHaveBeenCalled();
    expect(f.writes[0]?.table).toBe("offer_previews");
    expect(f.writes[0]?.data.status).toBe("failed");
    expect(new Date(String(f.writes[0]?.data.next_attempt_at)).getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
    expect(f.writes.every((write) => write.table === "offer_previews")).toBe(true);
  });
});