import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sha256Hex } from "./account-guard.server";

export const generateExtensionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token =
      "mdl_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const hash = await sha256Hex(token);
    const { data, error } = await context.supabase.rpc("create_extension_token", {
      p_token_hash: hash,
      p_prefix: token.slice(0, 10),
    });
    if (error) return { ok: false as const, message: "Não foi possível gerar o token." };
    const res = (data ?? {}) as { ok?: boolean; message?: string };
    if (!res.ok) return { ok: false as const, message: res.message ?? "Acesso negado." };
    // Plaintext token is returned once and never stored.
    return { ok: true as const, token };
  });
