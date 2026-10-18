import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { freeEntitlements, normalizePlanCode } from "./entitlements";

describe("plan fallback", () => {
  it("returns free for absent or invalid plans", () => {
    for (const value of [undefined, null, "", "unknown", "free"]) expect(normalizePlanCode(value)).toBe("free");
  });
  it("preserves paid effective plans", () => {
    for (const value of ["starter", "pro", "premium", "admin"]) expect(normalizePlanCode(value)).toBe(value);
  });
  it("does not grant free fallback access to offers or Pro tools", () => {
    const ent = freeEntitlements("new-user");
    expect(ent.planCode).toBe("free");
    expect(ent.features).not.toContain("vitrine_ofertas");
    expect(ent.features).not.toContain("modelads_spy_ia");
    expect(ent.unlimited).toBe(false);
    expect(ent.isAdmin).toBe(false);
  });
});