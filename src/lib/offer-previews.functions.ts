import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generatePendingPreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: suspended } = await context.supabase.rpc("is_user_suspended", { _user_id: context.userId });
    if (error || !admin || suspended !== false) throw new Error("Acesso restrito a administradores ativos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateOfferPreviews } = await import("./offer-previews.server");
    return generateOfferPreviews(supabaseAdmin);
  });