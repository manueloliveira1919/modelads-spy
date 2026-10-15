import { createFileRoute } from "@tanstack/react-router";

const TOLERANCE_S = 300;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Item = Record<string, unknown> & {
  id?: unknown;
  customer?: { email?: unknown };
  customerEmail?: unknown;
  offer?: { id?: unknown };
  createdAt?: unknown;
};

function eventKey(item: Item): string | null {
  if (item.id != null && String(item.id) !== "") return String(item.id);
  const email = item.customerEmail ?? item.customer?.email;
  const offer = item.offer?.id;
  if (email == null && offer == null && item.createdAt == null) return null;
  return `${String(email ?? "").toLowerCase()}|${String(offer ?? "")}|${String(item.createdAt ?? "")}`;
}

export const Route = createFileRoute("/api/public/cakto-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CAKTO_WEBHOOK_SECRET;
        if (!secret) return json({ ok: false, reason: "not_configured" }, 503);

        const raw = await request.text();
        const ts = request.headers.get("x-cakto-timestamp") ?? "";
        const sigHeader = request.headers.get("x-cakto-signature") ?? "";
        const provided = sigHeader.startsWith("v1=") ? sigHeader.slice(3).trim().toLowerCase() : "";
        const tsNum = Number(ts);
        if (!/^\d+$/.test(ts) || !provided || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_S) {
          return json({ ok: false, reason: "invalid_signature" }, 401);
        }
        const expected = await hmacHex(secret, `${ts}.${raw}`);
        if (!safeEqual(expected, provided)) return json({ ok: false, reason: "invalid_signature" }, 401);

        let body: { event?: unknown; data?: unknown };
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ ok: false, reason: "invalid_json" }, 400);
        }
        const event = typeof body.event === "string" ? body.event.slice(0, 100) : "";
        if (!event) return json({ ok: true, ignored: "no_event" }, 200);
        const items = (Array.isArray(body.data) ? body.data : [body.data]).filter(
          (x): x is Item => !!x && typeof x === "object",
        );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: unknown[] = [];
        for (const item of items.slice(0, 100)) {
          const key = eventKey(item);
          if (!key) {
            results.push({ status: "ignored", reason: "no_key" });
            continue;
          }
          const { data, error } = await supabaseAdmin.rpc("cakto_ingest_event", {
            p_event: event,
            p_key: key,
            p_data: item as never,
          });
          if (error) {
            console.error("[cakto-webhook]", error.message);
            return json({ ok: false, reason: "error" }, 500); // Cakto retries
          }
          results.push(data);
        }
        return json({ ok: true, results }, 200);
      },
    },
  },
});
