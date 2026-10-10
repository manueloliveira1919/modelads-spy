// Content script for https://www.facebook.com/ads/library*
(() => {
  const MAX_PER_SUBMIT = 50;
  const MONTHS = {
    jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5, jul: 6,
    ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11,
  };
  let state = { token: null, plan: null, minDays: 0 };
  let panel, msgEl, mineBtn;

  // "Veiculação iniciada em 12 de mar de 2025" / "Started running on Mar 12, 2025"
  function parseStart(text) {
    let m = text.match(/(\d{1,2})\s+de\s+([a-zç]{3})[a-zç.]*\s+de\s+(\d{4})/i);
    if (m) return new Date(+m[3], MONTHS[m[2].toLowerCase()] ?? NaN, +m[1]);
    m = text.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})/);
    if (m) return new Date(+m[3], MONTHS[m[1].toLowerCase()] ?? NaN, +m[2]);
    m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  // Cards: smallest ancestor of the "ID da biblioteca" text that also contains the start date.
  function findCards() {
    const cards = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue;
      const idm = t && t.match(/(?:ID da biblioteca|Library ID)\s*:?\s*(\d{5,})/i);
      if (!idm || seen.has(idm[1])) continue;
      let el = n.parentElement;
      for (let i = 0; el && i < 12; i++, el = el.parentElement) {
        if (/(Veiculação iniciada em|Started running on)/i.test(el.innerText || "") &&
            (el.innerText || "").length > 120) break;
      }
      if (!el) continue;
      seen.add(idm[1]);
      cards.push({ el, id: idm[1] });
    }
    return cards;
  }

  function cardData(card) {
    const text = card.el.innerText || "";
    const sm = text.match(/(?:Veiculação iniciada em|Started running on)\s*([^\n·]+)/i);
    const start = sm ? parseStart(sm[1]) : null;
    const days = start && !isNaN(start) ? Math.max(0, Math.floor((Date.now() - start) / 86400000)) : null;
    return { text, days };
  }

  function applyFilter() {
    if (!state.token) return;
    for (const card of findCards()) {
      const { days } = cardData(card);
      let badge = card.el.querySelector(":scope .mdl-badge");
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "mdl-badge";
        card.el.prepend(badge);
      }
      badge.textContent = days == null ? "Dias ativos: ?" : `${days} dias ativos`;
      const below = state.minDays > 0 && (days == null || days < state.minDays);
      badge.classList.toggle("mdl-low", below);
      card.el.classList.toggle("mdl-hidden", below);
      card.el.dataset.mdlDays = days ?? "";
    }
  }

  function keyword() {
    const u = new URL(location.href);
    return (u.searchParams.get("q") || "").slice(0, 200) || null;
  }

  function collect() {
    const out = [];
    for (const card of findCards()) {
      if (card.el.classList.contains("mdl-hidden")) continue;
      const { text, days } = cardData(card);
      const links = [...card.el.querySelectorAll("a[href]")].map((a) => a.href);
      const pageLink = links.find((h) => /facebook\.com\/(?!ads\/)/.test(h) && !/l\.facebook\.com/.test(h));
      const pageName = card.el.querySelector("a[href*='facebook.com/'] span, a[href*='facebook.com/']")?.innerText?.trim();
      let link = links.find((h) => /l\.facebook\.com\/l\.php/.test(h));
      if (link) { try { link = new URL(link).searchParams.get("u"); } catch { link = null; } }
      const media = card.el.querySelector("video[src]")?.src ||
        [...card.el.querySelectorAll("img[src]")].map((i) => i.src).find((s) => /scontent|fbcdn/.test(s) && !/s60x60|p60x60/.test(s));
      const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
      const creative = lines.filter((l) => l.length > 40).sort((a, b) => b.length - a.length)[0] || null;
      const pidm = pageLink && pageLink.match(/facebook\.com\/(?:profile\.php\?id=)?(\d{5,})/);
      const ok = (u) => (u && /^https?:\/\//i.test(u) && u.length <= 2000 ? u : null);
      out.push({
        ad_archive_id: card.id,
        keyword_used: keyword(),
        page_id: pidm ? pidm[1] : null,
        page_name: pageName ? pageName.slice(0, 300) : null,
        creative_text: creative ? creative.slice(0, 5000) : null,
        media_url: ok(media),
        link_url: ok(link),
        active_days: days,
      });
    }
    return out;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function loadMore(btn) {
    btn.disabled = true;
    for (let i = 0; i < 5; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
    }
    btn.disabled = false;
    applyFilter();
    msg(`${findCards().length} anúncios carregados.`);
  }

  function msg(t) { if (msgEl) msgEl.textContent = t; }

  async function mineAndSend() {
    if (state.plan !== "admin") return; // never called for non-admins
    const items = collect();
    if (!items.length) return msg("Nenhum anúncio visível para enviar.");
    mineBtn.disabled = true;
    let received = 0, inserted = 0, skipped = 0;
    for (let i = 0; i < items.length; i += MAX_PER_SUBMIT) {
      const batch = items.slice(i, i + MAX_PER_SUBMIT);
      msg(`Enviando ${i + batch.length}/${items.length}...`);
      const r = await mdlCall("submit", state.token, { candidates: batch });
      if (r.status === 429) {
        mineBtn.disabled = false;
        return msg(`Limite atingido. Aguarde ${r.retryAfter || "alguns"} segundos e tente de novo.\nJá enviados: ${received}.`);
      }
      if (r.status !== 200 || !r.data.ok) {
        mineBtn.disabled = false;
        return msg(r.data.message || `Erro no envio (${r.status}).`);
      }
      received += r.data.received || 0;
      inserted += r.data.inserted ?? r.data.new ?? 0;
      skipped += r.data.skipped ?? r.data.ignored ?? 0;
    }
    mineBtn.disabled = false;
    msg(`Enviado! Recebidos: ${received} · Novos: ${inserted} · Ignorados: ${skipped}`);
  }

  function buildPanel() {
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.className = "mdl-panel";
    panel.innerHTML = `
      <h4>Model Ads · ${state.plan === "admin" ? "admin" : "cliente"}</h4>
      <label>Dias mínimos <input type="number" min="0" class="mdl-min" /></label>
      <button class="mdl-more">Carregar mais</button>
      ${state.plan === "admin" ? '<button class="mdl-primary mdl-mine">Minerar e enviar ao Model Ads</button>' : ""}
      <div class="mdl-msg"></div>`;
    document.body.appendChild(panel);
    msgEl = panel.querySelector(".mdl-msg");
    const min = panel.querySelector(".mdl-min");
    min.value = state.minDays || "";
    min.oninput = () => {
      state.minDays = Math.max(0, parseInt(min.value, 10) || 0);
      chrome.storage.local.set({ mdlMinDays: state.minDays });
      applyFilter();
    };
    const more = panel.querySelector(".mdl-more");
    more.onclick = () => loadMore(more);
    mineBtn = panel.querySelector(".mdl-mine");
    if (mineBtn) mineBtn.onclick = mineAndSend;
  }

  async function init() {
    const s = await chrome.storage.local.get(["mdlToken", "mdlMinDays"]);
    state.minDays = s.mdlMinDays || 0;
    if (!s.mdlToken) return;
    const r = await mdlValidate(s.mdlToken);
    if (r.status !== 200 || !r.data.ok) return; // not connected: do nothing
    state.token = s.mdlToken;
    state.plan = r.data.plan_code;
    chrome.storage.local.set({ mdlPlan: state.plan });
    buildPanel();
    applyFilter();
    let t;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(applyFilter, 600); })
      .observe(document.body, { childList: true, subtree: true });
  }

  chrome.storage.onChanged.addListener((c) => {
    if (c.mdlMinDays && state.token) {
      state.minDays = c.mdlMinDays.newValue || 0;
      const min = panel?.querySelector(".mdl-min");
      if (min) min.value = state.minDays || "";
      applyFilter();
    }
    if (c.mdlToken && !c.mdlToken.newValue) {
      state.token = null; state.plan = null; panel?.remove();
      document.querySelectorAll(".mdl-hidden").forEach((e) => e.classList.remove("mdl-hidden"));
      document.querySelectorAll(".mdl-badge").forEach((e) => e.remove());
    }
    if (c.mdlToken?.newValue) init();
  });

  init();
})();
