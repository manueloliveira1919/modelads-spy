// Shared API helpers (popup + content script).
const MODELADS_API = "https://modelads-spy.lovable.app/api/public/extension";

async function mdlCall(path, token, body) {
  try {
    const r = await fetch(`${MODELADS_API}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    let data = {};
    try { data = await r.json(); } catch { /* empty */ }
    const retry = Number(r.headers.get("Retry-After") || data.retry_after || 0);
    return { status: r.status, data, retryAfter: retry };
  } catch (e) {
    return { status: 0, data: { ok: false, message: "Sem conexão com o Model Ads." }, retryAfter: 0 };
  }
}

async function mdlValidate(token) {
  const r = await mdlCall("validate", token);
  return r;
}
