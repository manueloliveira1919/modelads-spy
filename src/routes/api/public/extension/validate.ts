import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex } from "@/lib/account-guard.server";
import { checkExtensionRate, rateLimitedResponse } from "@/lib/extension-rate-limit.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Expose-Headers": "Retry-After",
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
        const rate = await checkExtensionRate(supabaseAdmin, hash);
        if (!rate.ok) return rateLimitedResponse(rate, cors);
        const { data, error } = await supabaseAdmin.rpc("validate_extension_token", {
          p_token_hash: hash,
        });
        if (error) return json({ ok: false, reason: "error" }, 500);
        const res = (data ?? { ok: false }) as { ok: boolean; reason?: string; user_id?: string };
        if (!res.ok) return json(res, res.reason === "invalid_token" ? 401 : 403);
        // plan_code drives extension UI only; submit re-checks admin server-side.
        let plan_code = "starter";
        if (res.user_id) {
          const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
            _user_id: res.user_id,
            _role: "admin",
          });
          if (isAdmin) plan_code = "admin";
          else {
            const { data: sub } = await supabaseAdmin
              .from("user_subscriptions")
              .select("plan_code")
              .eq("user_id", res.user_id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (sub?.plan_code) plan_code = String(sub.plan_code);
          }
        }
        return json({ ...res, plan_code }, 200);
      },
    },
  },
});
