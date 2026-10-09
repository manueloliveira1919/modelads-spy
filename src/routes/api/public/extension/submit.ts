import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sha256Hex } from "@/lib/account-guard.server";

const MAX_PER_CALL = 50;

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

const str = (max: number) => z.string().trim().max(max).optional().nullable();
// Only http(s): blocks javascript:/data: links that could later be rendered as href/src.
const httpUrl = z.string().url().max(2000).regex(/^https?:\/\//i).optional().nullable();
const Candidate = z.object({
  ad_archive_id: z.string().trim().regex(/^[0-9A-Za-z_-]{3,64}$/),
  keyword_used: str(200),
  page_id: str(64),
  page_name: str(300),
  creative_text: str(5000),
  media_url: httpUrl,
  link_url: httpUrl,
  active_days: z.number().int().min(0).max(5000).optional().nullable(),
  repeated_ads_count: z.number().int().min(0).max(100000).optional().nullable(),
});
const Body = z.object({ candidates: z.array(Candidate).min(1) });

export const Route = createFileRoute("/api/public/extension/submit")({
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
        const { data, error } = await supabaseAdmin.rpc("validate_extension_token", {
          p_token_hash: await sha256Hex(token),
        });
        if (error) return json({ ok: false, reason: "error" }, 500);
        const res = (data ?? { ok: false }) as { ok: boolean; reason?: string; user_id?: string };
        if (!res.ok || !res.user_id) return json(res, res.reason === "invalid_token" ? 401 : 403);

        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: res.user_id,
          _role: "admin",
        });
        if (!isAdmin) {
          return json(
            { ok: false, reason: "not_admin", message: "Envio disponível apenas para administradores no momento." },
            403,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, reason: "invalid_body", message: "JSON inválido." }, 400);
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          return json({ ok: false, reason: "invalid_body", message: "Candidatos inválidos.", issues: parsed.error.issues.slice(0, 5) }, 400);
        }
        if (parsed.data.candidates.length > MAX_PER_CALL) {
          return json({ ok: false, reason: "too_many", message: `Máximo de ${MAX_PER_CALL} candidatos por envio.` }, 413);
        }
        // Dedup inside the payload itself.
        const unique = [...new Map(parsed.data.candidates.map((c) => [c.ad_archive_id, c])).values()];
        const { data: result, error: insErr } = await supabaseAdmin.rpc("extension_submit_candidates", {
          p_user_id: res.user_id,
          p_rows: unique as never,
        });
        if (insErr) return json({ ok: false, reason: "error" }, 500);
        return json({ ok: true, received: parsed.data.candidates.length, ...(result as object) }, 200);
      },
    },
  },
});
