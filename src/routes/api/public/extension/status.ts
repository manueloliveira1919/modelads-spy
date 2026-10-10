import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
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

const Body = z.object({
  ad_archive_ids: z.array(z.string().trim().regex(/^[0-9A-Za-z_-]{3,64}$/)).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Returns only candidates submitted by the token's owner.
export const Route = createFileRoute("/api/public/extension/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!/^mdl_[a-f0-9]{64}$/.test(token)) {
          return json({ ok: false, reason: "invalid_token", message: "Token inválido." }, 401);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenHash = await sha256Hex(token);
        const rate = await checkExtensionRate(supabaseAdmin, tokenHash);
        if (!rate.ok) return rateLimitedResponse(rate, cors);
        const { data, error } = await supabaseAdmin.rpc("validate_extension_token", {
          p_token_hash: tokenHash,
        });
        if (error) return json({ ok: false, reason: "error" }, 500);
        const res = (data ?? { ok: false }) as { ok: boolean; reason?: string; user_id?: string };
        if (!res.ok || !res.user_id) return json(res, res.reason === "invalid_token" ? 401 : 403);

        let body: unknown = {};
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : {};
        } catch {
          return json({ ok: false, reason: "invalid_body", message: "JSON inválido." }, 400);
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) return json({ ok: false, reason: "invalid_body", message: "Consulta inválida." }, 400);

        const { data: items, error: qErr } = await supabaseAdmin.rpc("extension_candidate_status", {
          p_user_id: res.user_id,
          p_ids: parsed.data.ad_archive_ids ?? undefined,
          p_limit: parsed.data.limit ?? 50,
        });
        if (qErr) return json({ ok: false, reason: "error" }, 500);
        return json({ ok: true, items }, 200);
      },
    },
  },
});
