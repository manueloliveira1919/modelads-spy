import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const processExtensionCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false as const, message: "Acesso negado." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processPendingCandidates } = await import("./extension-candidates.server");
    try {
      const res = await processPendingCandidates(supabaseAdmin);
      return { ok: true as const, ...res };
    } catch (e) {
      console.error("processExtensionCandidates", (e as Error).message);
      return { ok: false as const, message: "Falha ao processar candidatos." };
    }
  });
