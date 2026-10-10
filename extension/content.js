// Content script for https://www.facebook.com/ads/library*
(() => {
  const MAX_PER_SUBMIT = 50;
  const MONTHS = {
    jan: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5, jul: 6,
    ago: 7, aug: 7, set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dec: 11,
  };
  const VERSION = chrome.runtime.getManifest().version;
  const LABEL_RE = /(identificacao da biblioteca|id da biblioteca|library id)/i;
  const LABEL_G = /(identificacao da biblioteca|id da biblioteca|library id)/gi;
  const ID_RE = /(?:identificacao da biblioteca|id da biblioteca|library id)\s*:?\s*(\d{8,})/i;
  const START_RE = /(?:veiculacao iniciada em|started running on)\s*([^\n·]+)/i;
  const REPEAT_RE = /(\d+)\s+(?:anuncios usam esse criativo|anuncios usam este criativo|ads use this creative)/i;

  let state = { token: null, plan: null, minDays: 0, minAds: 0, collapsed: false };
  let panel, msgEl, mineBtn, countEl;

  const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const flat = (s) => norm(s).replace(/[\u00a0\s]+/g, " ").toLowerCase();
  const diag = { labels: 0, cards: 0, dated: 0, errors: 0, lastError: "", sample: "" };
  let diagEl;
  function logErr(e) {
    diag.errors++; diag.lastError = String(e && e.message || e).slice(0, 200);
    renderDiag();
  }
  function renderDiag() {
    if (diagEl) diagEl.textContent = `Diagnóstico: rótulos ${diag.labels} · cards ${diag.cards} · com data ${diag.dated} · erros ${diag.errors}${diag.lastError ? "\nÚltimo erro: " + diag.lastError : ""}`;
  }

  // "2 de set de 2025" / "Mar 12, 2025" / "12/03/2025" (input already normalized)
  function parseStart(text) {
    let m = text.match(/(\d{1,2})\s+de\s+([a-z]{3})[a-z.]*\s+de\s+(\d{4})/i);
    if (m) return new Date(+m[3], MONTHS[m[2].toLowerCase()] ?? NaN, +m[1]);
    m = text.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/);
    if (m) return new Date(+m[3], MONTHS[m[1].toLowerCase()] ?? NaN, +m[2]);
    m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  function isCard(t) {
    const m = t.match(LABEL_G);
    if (!m || m.length !== 1) return m && m.length > 1 ? -1 : 0;
    return ID_RE.test(t) && /veiculacao iniciada em|started running on/.test(t) &&
      /ver detalhes do anuncio|ver resumo|see ad details|see summary/.test(t) ? 1 : 0;
  }

  function findCards() {
    const cards = [];
    const seen = new Set();
    const labels = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!LABEL_RE.test(norm(n.nodeValue))) continue;
      const p = n.parentElement;
      if (!p || p.closest(".mdl-panel, .mdl-bar")) continue;
      labels.push(p);
    }
    diag.labels = labels.length;
    if (labels[0] && !diag.sample) diag.sample = labels[0];
    for (const lab of labels) {
      let el = lab, found = null, lastSingle = null;
      for (let i = 0; el && el !== document.body && i < 25; i++, el = el.parentElement) {
        const r = isCard(flat(el.innerText));
        if (r === -1) break;
        if (ID_RE.test(flat(el.innerText))) lastSingle = el;
        if (r === 1) { found = el; break; }
      }
      found = found || lastSingle; // fallback: maior ancestral com um único rótulo
      if (!found) continue;
      const idm = flat(found.innerText).match(ID_RE);
      if (!idm || seen.has(idm[1])) continue;
      seen.add(idm[1]);
      cards.push({ el: found, id: idm[1] });
    }
    diag.cards = cards.length;
    if (cards[0]) diag.sample = cards[0].el;
    return cards;
  }

  function cardData(card) {
    const raw = card.el.innerText || "";
    const text = flat(raw);
    const sm = text.match(START_RE);
    const start = sm ? parseStart(sm[1]) : null;
    const days = start && !isNaN(start) ? Math.max(0, Math.floor((Date.now() - start) / 86400000)) : null;
    const rm = text.match(REPEAT_RE);
    const repeated = rm ? parseInt(rm[1], 10) : 1;
    return { raw, days, repeated, start: start && !isNaN(start) ? start : null };
  }

  const IGNORE = /^(ativo|inativo|active|inactive|plataformas|platforms|ver detalhes do anuncio|see ad details|ver resumo|see summary|patrocinado|sponsored)$/i;
  function creativeText(card) {
    const lines = cardData(card).raw.split("\n").map((s) => s.trim()).filter(Boolean);
    const good = lines.filter((l) => {
      const nl = norm(l);
      return l.length > 40 && !IGNORE.test(nl) && !ID_RE.test(nl) && !START_RE.test(nl) &&
        !REPEAT_RE.test(nl) && !/varias versoes|multiple versions/i.test(nl);
    });
    return good.sort((a, b) => b.length - a.length)[0] || null;
  }

  function mediaOf(card) {
    const v = card.el.querySelector("video");
    if (v) {
      const src = v.currentSrc || v.src || v.querySelector("source[src]")?.src;
      return { type: "video", url: src && /^https?:/.test(src) ? src : null, poster: v.poster || null };
    }
    const img = [...card.el.querySelectorAll("img[src]")].map((i) => i.src)
      .find((s) => /scontent|fbcdn/.test(s) && !/s60x60|p60x60/.test(s));
    return img ? { type: "image", url: img } : null;
  }

  function passes(d) {
    if (state.minDays > 0 && (d.days == null || d.days < state.minDays)) return false;
    if (state.minAds > 0 && d.repeated < state.minAds) return false;
    return true;
  }

  function stage(d) {
    const days = d.days || 0, n = d.repeated || 0;
    if (days >= 30 && n >= 30) return "Escaladíssimo";
    if (days >= 20 && n >= 20) return "Escalado";
    if (days >= 5 && n >= 10) return "Testando";
    return "Sem sinal de escala";
  }
  const libLink = (id) => `https://www.facebook.com/ads/library/?id=${id}`;

  async function clip(t) {
    try { await navigator.clipboard.writeText(t); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
  }

  function summary(card, full) {
    const d = cardData(card), c = candidate(card);
    const lines = [
      `Página: ${c.page_name || "?"}`,
      `ID do anúncio: ${card.id}`,
      `Início: ${d.start ? d.start.toLocaleDateString("pt-BR") : "?"}`,
      `Dias ativos: ${d.days ?? "?"}`,
      `Anúncios (mesmo criativo): ${d.repeated}`,
      `Estágio estimado: ${stage(d)}`,
    ];
    if (c.link_url) lines.push(`Destino: ${c.link_url}`);
    lines.push(`Biblioteca: ${libLink(card.id)}`);
    if (full && c.creative_text) lines.push("", "Copy:", c.creative_text);
    return lines.join("\n");
  }

  async function share(card, btn) {
    const text = summary(card, false);
    if (navigator.share) {
      try { await navigator.share({ title: "Oferta - Model Ads", text, url: libLink(card.id) }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    await clip(text); flash(btn, "Link copiado!");
  }

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = old), 1400);
  }

  async function copyText(card, btn) {
    const t = creativeText(card);
    if (!t) return flash(btn, "Sem texto");
    await clip(t);
    flash(btn, "Copiado!");
  }

  async function download(card, btn) {
    const m = mediaOf(card);
    if (!m) return flash(btn, "Sem mídia");
    if (!m.url) {
      if (m.poster) window.open(m.poster, "_blank");
      return flash(btn, "Abra o vídeo");
    }
    try {
      const r = await fetch(m.url);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = m.type === "video" ? "mp4" : (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      a.download = `anuncio-${card.id}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      flash(btn, "Baixado!");
    } catch {
      window.open(m.url, "_blank");
      flash(btn, "Aberto");
    }
  }

  function ensureBar(card) {
    let bar = card.el.querySelector(":scope > .mdl-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.className = "mdl-bar";
    bar.innerHTML = `
      <span class="mdl-badge mdl-days"></span>
      <span class="mdl-badge mdl-rep"></span>
      <span class="mdl-badge mdl-stage" title="Estágio estimado: o nº de anúncios do card é só o de repetições do mesmo criativo"></span>
      <button class="mdl-act" data-a="copy" title="Copiar copy">📋 Copiar</button>
      <button class="mdl-act" data-a="all" title="Copiar todos os dados">📄 Copiar tudo</button>
      <button class="mdl-act" data-a="share" title="Compartilhar">🔗 Compartilhar</button>
      <button class="mdl-act" data-a="dl" title="Baixar criativo">⬇ Baixar</button>
      <button class="mdl-act" data-a="open" title="Abrir na biblioteca">↗ Abrir</button>
      ${state.plan === "admin" ? '<button class="mdl-act mdl-send" data-a="send" title="Enviar ao Model Ads">➤ Enviar</button>' : ""}`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const a = b.dataset.a;
      if (a === "copy") copyText(card, b);
      else if (a === "all") clip(summary(card, true)).then(() => flash(b, "Copiado!"));
      else if (a === "share") share(card, b);
      else if (a === "dl") download(card, b);
      else if (a === "open") window.open(libLink(card.id), "_blank");
      else if (a === "send" && state.plan === "admin") sendOne(card, b);
    });
    card.el.prepend(bar);
    return bar;
  }

  function applyFilter() {
    try { applyFilterInner(); } catch (e) { logErr(e); }
  }
  function applyFilterInner() {
    if (!state.token) return;
    const cards = findCards();
    let visible = 0, dated = 0;
    for (const card of cards) {
      const d = cardData(card);
      if (d.days != null) dated++;
      const bar = ensureBar(card);
      bar.querySelector(".mdl-days").textContent = d.days == null ? "Dias ativos: ?" : `${d.days} dias ativos`;
      bar.querySelector(".mdl-rep").textContent = `${d.repeated} anúncio${d.repeated === 1 ? "" : "s"}`;
      bar.querySelector(".mdl-stage").textContent = `${stage(d)} (estimado)`;
      const ok = passes(d);
      card.el.classList.toggle("mdl-hidden", !ok);
      card.el.dataset.mdlDays = d.days ?? "";
      card.el.dataset.mdlRep = d.repeated;
      if (ok) visible++;
    }
    diag.dated = dated;
    if (countEl) countEl.textContent = `${cards.length} carregados · ${visible} visíveis`;
    renderDiag();
  }

  function keyword() {
    const u = new URL(location.href);
    return (u.searchParams.get("q") || "").slice(0, 200) || null;
  }

  function candidate(card) {
    const { days, repeated } = cardData(card);
    const links = [...card.el.querySelectorAll("a[href]")].map((a) => a.href);
    const pageLink = links.find((h) => /facebook\.com\/(?!ads\/)/.test(h) && !/l\.facebook\.com/.test(h));
    const pageName = card.el.querySelector("a[href*='facebook.com/'] span, a[href*='facebook.com/']")?.innerText?.trim();
    let link = links.find((h) => /l\.facebook\.com\/l\.php/.test(h));
    if (link) { try { link = new URL(link).searchParams.get("u"); } catch { link = null; } }
    const m = mediaOf(card);
    const media = m ? m.url || m.poster : null;
    const creative = creativeText(card);
    const pidm = pageLink && pageLink.match(/facebook\.com\/(?:profile\.php\?id=)?(\d{5,})/);
    const ok = (u) => (u && /^https?:\/\//i.test(u) && u.length <= 2000 ? u : null);
    return {
      ad_archive_id: card.id,
      keyword_used: keyword(),
      page_id: pidm ? pidm[1] : null,
      page_name: pageName ? pageName.slice(0, 300) : null,
      creative_text: creative ? creative.slice(0, 5000) : null,
      media_url: ok(media),
      link_url: ok(link),
      active_days: days,
      repeated_ads_count: Math.min(repeated, 100000),
    };
  }

  function collect() {
    return findCards().filter((c) => !c.el.classList.contains("mdl-hidden")).map(candidate);
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
  }

  function msg(t) { if (msgEl) msgEl.textContent = t; }

  // Shared submit with 429 handling. Admin only.
  async function submit(batch) {
    const r = await mdlCall("submit", state.token, { candidates: batch });
    if (r.status === 429) return { err: `Limite atingido. Aguarde ${r.retryAfter || "alguns"} segundos e tente de novo.` };
    if (r.status !== 200 || !r.data.ok) return { err: r.data.message || `Erro no envio (${r.status}).` };
    return {
      received: r.data.received || 0,
      inserted: r.data.inserted ?? r.data.new ?? 0,
      skipped: r.data.skipped ?? r.data.ignored ?? 0,
    };
  }

  async function sendOne(card, btn) {
    if (state.plan !== "admin") return;
    btn.disabled = true;
    const r = await submit([candidate(card)]);
    btn.disabled = false;
    if (r.err) { msg(r.err); return flash(btn, "Erro"); }
    msg(`Anúncio ${card.id}: ${r.inserted ? "novo" : "já existia / ignorado"}.`);
    flash(btn, "Enviado!");
  }

  async function mineAndSend() {
    if (state.plan !== "admin") return;
    const items = collect();
    if (!items.length) return msg("Nenhum anúncio visível para enviar.");
    mineBtn.disabled = true;
    let received = 0, inserted = 0, skipped = 0;
    for (let i = 0; i < items.length; i += MAX_PER_SUBMIT) {
      const batch = items.slice(i, i + MAX_PER_SUBMIT);
      msg(`Enviando ${i + batch.length}/${items.length}...`);
      const r = await submit(batch);
      if (r.err) {
        mineBtn.disabled = false;
        return msg(`${r.err}\nJá enviados: ${received}.`);
      }
      received += r.received; inserted += r.inserted; skipped += r.skipped;
    }
    mineBtn.disabled = false;
    msg(`Enviado! Recebidos: ${received} · Novos: ${inserted} · Ignorados: ${skipped}`);
  }

  function setCollapsed(v) {
    state.collapsed = v;
    chrome.storage.local.set({ mdlCollapsed: v });
    panel?.classList.toggle("mdl-collapsed", v);
    const t = panel?.querySelector(".mdl-toggle");
    if (t) t.textContent = v ? "▢" : "—";
  }

  function buildPanel() {
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.className = "mdl-panel";
    panel.innerHTML = `
      <div class="mdl-head"><h4>Model Ads v${VERSION} · ${state.plan === "admin" ? "admin" : "cliente"}</h4>
        <button class="mdl-toggle" title="Recolher/expandir">—</button></div>
      <div class="mdl-count"></div>
      <div class="mdl-body">
        <label>Dias mínimos <input type="number" min="0" class="mdl-min" /></label>
        <label>Anúncios mínimos (mesmo criativo) <input type="number" min="0" class="mdl-minads" /></label>
        <button class="mdl-more">Carregar mais</button>
        ${state.plan === "admin" ? '<button class="mdl-primary mdl-mine">Minerar e enviar ao Model Ads</button>' : ""}
        <div class="mdl-msg"></div>
        <div class="mdl-diag"></div>
        <button class="mdl-copydiag">Copiar diagnóstico</button>
      </div>`;
    document.body.appendChild(panel);
    msgEl = panel.querySelector(".mdl-msg");
    countEl = panel.querySelector(".mdl-count");
    diagEl = panel.querySelector(".mdl-diag");
    const cd = panel.querySelector(".mdl-copydiag");
    cd.onclick = async () => {
      const smp = diag.sample ? flat(diag.sample.innerText).slice(0, 300) : "(nenhum)";
      await clip([`Model Ads extensão v${VERSION}`, `URL: ${location.origin}${location.pathname}`,
        `Rótulos de ID: ${diag.labels}`, `Cards montados: ${diag.cards}`, `Com data lida: ${diag.dated}`,
        `Erros: ${diag.errors}${diag.lastError ? " (" + diag.lastError + ")" : ""}`, `Amostra: ${smp}`].join("\n"));
      flash(cd, "Copiado!");
    };
    renderDiag();
    const min = panel.querySelector(".mdl-min");
    min.value = state.minDays || "";
    min.oninput = () => {
      state.minDays = Math.max(0, parseInt(min.value, 10) || 0);
      chrome.storage.local.set({ mdlMinDays: state.minDays });
      applyFilter();
    };
    const minAds = panel.querySelector(".mdl-minads");
    minAds.value = state.minAds || "";
    minAds.oninput = () => {
      state.minAds = Math.max(0, parseInt(minAds.value, 10) || 0);
      chrome.storage.local.set({ mdlMinAds: state.minAds });
      applyFilter();
    };
    panel.querySelector(".mdl-toggle").onclick = () => setCollapsed(!state.collapsed);
    const more = panel.querySelector(".mdl-more");
    more.onclick = () => loadMore(more);
    mineBtn = panel.querySelector(".mdl-mine");
    if (mineBtn) mineBtn.onclick = mineAndSend;
    setCollapsed(state.collapsed);
  }

  function clearUi() {
    panel?.remove(); panel = null;
    document.querySelectorAll(".mdl-hidden").forEach((e) => e.classList.remove("mdl-hidden"));
    document.querySelectorAll(".mdl-bar").forEach((e) => e.remove());
  }

  let observer, ticker;
  async function init() {
    try { await initInner(); } catch (e) { logErr(e); }
  }
  async function initInner() {
    const s = await chrome.storage.local.get(["mdlToken", "mdlMinDays", "mdlMinAds", "mdlCollapsed"]);
    state.minDays = s.mdlMinDays || 0;
    state.minAds = s.mdlMinAds || 0;
    state.collapsed = !!s.mdlCollapsed;
    if (!s.mdlToken) return;
    const r = await mdlValidate(s.mdlToken);
    if (r.status !== 200 || !r.data.ok) return;
    state.token = s.mdlToken;
    state.plan = r.data.plan_code;
    chrome.storage.local.set({ mdlPlan: state.plan });
    document.querySelectorAll(".mdl-bar").forEach((e) => e.remove()); // rebuild with right plan
    buildPanel();
    applyFilter();
    if (!observer) {
      let t;
      observer = new MutationObserver((muts) => {
        if (muts.every((m) => m.target.closest?.(".mdl-panel, .mdl-bar"))) return;
        clearTimeout(t); t = setTimeout(applyFilter, 600);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (!ticker) {
      let k = 0;
      ticker = setInterval(() => { applyFilter(); if (++k >= 10) clearInterval(ticker); }, 2000);
    }
  }

  chrome.storage.onChanged.addListener((c) => {
    if (c.mdlMinDays && state.token) {
      state.minDays = c.mdlMinDays.newValue || 0;
      const el = panel?.querySelector(".mdl-min");
      if (el && document.activeElement !== el) el.value = state.minDays || "";
      applyFilter();
    }
    if (c.mdlMinAds && state.token) {
      state.minAds = c.mdlMinAds.newValue || 0;
      const el = panel?.querySelector(".mdl-minads");
      if (el && document.activeElement !== el) el.value = state.minAds || "";
      applyFilter();
    }
    if (c.mdlToken && !c.mdlToken.newValue) {
      state.token = null; state.plan = null; clearUi();
    }
    if (c.mdlToken?.newValue) init();
  });

  window.addEventListener("error", (e) => { if (String(e.filename || "").startsWith("chrome-extension://")) logErr(e.error || e.message); });
  init();
})();
