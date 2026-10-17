import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BATCHES_PER_CLICK = 5;

export const generatePendingPreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: suspended } = await context.supabase.rpc("is_user_suspended", { _user_id: context.userId });
    if (error || !admin || suspended !== false) throw new Error("Acesso restrito a administradores ativos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateOfferPreviews } = await import("./offer-previews.server");
    // Up to 5 batches of 10 per click; stops early when a batch comes back empty.
    let processed = 0;
    let saved = 0;
    let failed = 0;
    for (let batch = 0; batch < MAX_BATCHES_PER_CLICK; batch++) {
      const result = await generateOfferPreviews(supabaseAdmin);
      if (!result.ok) return { ...result, processed, saved, failed };
      processed += result.processed;
      saved += result.saved;
      failed += result.failed;
      if (result.processed === 0) break;
    }
    return { ok: true as const, processed, saved, failed };
  });
