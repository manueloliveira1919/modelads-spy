import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fase 1: SOMENTE dryRun. Não existe caminho de escrita nesta função.
export const auditOfferQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ dryRun: z.literal(true) }).parse(input),
  )
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("mining_is_admin", {
      p_user_id: context.userId,
    });
    if (error || !isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runQualityDryRun } = await import("./offer-quality.server");
    return runQualityDryRun(supabaseAdmin);
  });

// Fase 2 (aprovada): grava a classificação nas ofertas existentes.
// Toca SOMENTE commercial_quality, quality_reasons e quality_checked_at.
export const applyOfferQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ confirm: z.literal(true) }).parse(input),
  )
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("mining_is_admin", {
      p_user_id: context.userId,
    });
    if (error || !isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyQualityClassification } = await import("./offer-quality.server");
    return applyQualityClassification(supabaseAdmin);
  });
