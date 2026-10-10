const $ = (id) => document.getElementById(id);

function render(state) {
  const on = !!state.mdlToken;
  $("disconnected").classList.toggle("hidden", on);
  $("connected").classList.toggle("hidden", !on);
  $("status").textContent = on
    ? `🟢 Conectado como ${state.mdlPlan === "admin" ? "admin" : "cliente"} (${state.mdlPlan || "—"})`
    : "🔴 Não conectada";
  $("minDays").value = state.mdlMinDays || "";
}

async function load() {
  const s = await chrome.storage.local.get(["mdlToken", "mdlPlan", "mdlMinDays"]);
  render(s);
  if (s.mdlToken) {
    const r = await mdlValidate(s.mdlToken);
    if (r.status === 200 && r.data.ok) {
      await chrome.storage.local.set({ mdlPlan: r.data.plan_code });
      render({ ...s, mdlPlan: r.data.plan_code });
    } else if (r.status === 401 || r.status === 403) {
      await chrome.storage.local.remove(["mdlToken", "mdlPlan"]);
      render({});
      $("msg").textContent = r.data.message || "Token não é mais válido.";
    }
  }
}

$("connect").onclick = async () => {
  const token = $("token").value.trim();
  $("msg").textContent = "";
  if (!/^mdl_[a-f0-9]{64}$/.test(token)) {
    $("msg").textContent = "Token inválido. Gere um em Minha Conta.";
    return;
  }
  $("connect").disabled = true;
  const r = await mdlValidate(token);
  $("connect").disabled = false;
  if (r.status === 200 && r.data.ok) {
    await chrome.storage.local.set({ mdlToken: token, mdlPlan: r.data.plan_code });
    $("token").value = "";
    $("ver").textContent = "v" + chrome.runtime.getManifest().version;
load();
  } else if (r.status === 429) {
    $("msg").textContent = `Muitas tentativas. Aguarde ${r.retryAfter}s.`;
  } else {
    $("msg").textContent = r.data.message || "Não foi possível conectar.";
  }
};

$("disconnect").onclick = async () => {
  await chrome.storage.local.remove(["mdlToken", "mdlPlan"]);
  render({});
};

$("minDays").oninput = async (e) => {
  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
  await chrome.storage.local.set({ mdlMinDays: v });
};

$("ver").textContent = "v" + chrome.runtime.getManifest().version;
load();
