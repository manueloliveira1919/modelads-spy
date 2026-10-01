import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex } from "@/lib/account-guard.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

export const Route = createFileRoute("/api/public/extension/validate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!/^mdl_[a-f0-9]{64}$/.test(token)) {
          return json({ ok: false, reason: "invalid_token", message: "Token inválido." }, 401);
        }
        const hash = await sha256Hex(token);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("validate_extension_token", {
          p_token_hash: hash,
        });
        if (error) return json({ ok: false, reason: "error" }, 500);
        const res = (data ?? { ok: false }) as { ok: boolean; reason?: string };
        if (!res.ok) return json(res, res.reason === "invalid_token" ? 401 : 403);
        return json(res, 200);
      },
    },
  },
});
