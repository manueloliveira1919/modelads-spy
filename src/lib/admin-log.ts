import { supabase } from "@/integrations/supabase/client";

/**
 * Insere um registro em system_logs. Nunca lança — logs não podem quebrar UX.
 */
export async function logSystem(opts: {
  action: string;
  kind?: string;
  result?: "success" | "error" | "info";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("system_logs").insert({
      user_id: data.user?.id ?? null,
      action: opts.action,
      kind: opts.kind ?? "admin",
      result: opts.result ?? "success",
      metadata: (opts.metadata ?? {}) as never,
    });
  } catch {
    /* noop */
  }
}
