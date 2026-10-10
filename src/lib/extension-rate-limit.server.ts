// Per-token rate limiting for extension endpoints. Limits live in the
// admin-editable extension_rate_limits table; counting is atomic in SQL.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type RateResult = { ok: boolean; retry_after?: number; [k: string]: unknown };

export async function checkExtensionRate(
  supabaseAdmin: any,
  tokenHash: string,
  ads = 0,
  countRequest = true,
): Promise<RateResult> {
  const { data, error } = await supabaseAdmin.rpc("extension_rate_check", {
    p_token_hash: tokenHash,
    p_ads: ads,
    p_count_request: countRequest,
  });
  if (error) return { ok: false, reason: "error" };
  return (data ?? { ok: true }) as RateResult;
}

export function rateLimitedResponse(res: RateResult, cors: Record<string, string>) {
  const status = res.reason === "error" ? 500 : 429;
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      "content-type": "application/json",
      ...(res.retry_after ? { "Retry-After": String(res.retry_after) } : {}),
      ...cors,
    },
  });
}
