import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, Children, isValidElement, cloneElement } from "react";
import { GuaranteeBadge } from "./guarantee-badge";
import { ExtendedSection, EXTENDED_PAGE_CSS } from "./extended-sections";
import { installPageInteractions } from "./section-interactions";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, GripVertical, Trash2, EyeOff } from "lucide-react";
import { pageBackground, sectionButtons } from "@/lib/sales-page-layout";
import { buttonDestination, elementCss } from "@/lib/sales-page-elements";
import { BLOCK_MAP, type PageSection, type PageSettings } from "@/lib/sales-page-types";

/* Renderizador único: editor, página pública e exportação HTML usam o mesmo código.
   Usa estilos inline + uma folha `PAGE_CSS` com classes `sp-` para ficar autocontido. */

export const PAGE_CSS = `
.sp-root{container-type:inline-size;width:100%;-webkit-font-smoothing:antialiased;line-height:1.55}
.sp-root *{box-sizing:border-box}
.sp-root img{max-width:100%;display:block}
.sp-wrap{margin:0 auto;padding:0 24px}
.sp-element{position:relative;min-width:0}.sp-element[data-selected="true"]{outline:2px solid var(--brand);outline-offset:3px}.sp-element-tools{display:flex;gap:2px;position:absolute;top:0;right:0;z-index:5;background:var(--card);color:var(--foreground);border-radius:4px}.sp-element[data-drop="before"]::before,.sp-element[data-drop="after"]::after{content:"";position:absolute;left:0;right:0;height:3px;background:var(--brand);z-index:9}.sp-element[data-drop="before"]::before{top:-5px}.sp-element[data-drop="after"]::after{bottom:-5px}.sp-ordered{display:flex;flex-direction:column;gap:var(--sp-gap,20px)}
.sp-h{margin:0 0 16px;line-height:1.15;font-weight:800;letter-spacing:0}
.sp-p{margin:0;white-space:pre-line}
.sp-grid{display:grid;gap:20px;grid-template-columns:repeat(var(--sp-columns,3),minmax(0,1fr));margin-top:32px;text-align:left}
.sp-grid2{display:grid;gap:20px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:32px}
.sp-card{padding:28px;border-radius:var(--sp-r);background:var(--sp-card);border:1px solid color-mix(in srgb,currentColor 9%,transparent);box-shadow:0 12px 36px -24px color-mix(in srgb,currentColor 28%,transparent)}
.sp-offer{position:relative;box-shadow:0 22px 60px -28px color-mix(in srgb,currentColor 30%,transparent)}.sp-offer-label{display:inline-block;padding:7px 18px;border-radius:var(--sp-r);font-size:12px;font-weight:800;margin-bottom:20px}.sp-offer .sp-btn{display:block;width:100%;text-align:center}.sp-element-tools{top:-28px}.sp-carousel-track>.sp-element{flex:0 0 calc(100% / var(--sp-per-view,1));min-width:0}.sp-carousel-track>.sp-element>figure{width:100%;padding:0 8px}.sp-flex-grid>.sp-element{min-width:0;height:100%}.sp-flex-grid>.sp-element>article{height:100%}.sp-root section{scroll-margin-top:20px}.sp-root p,.sp-root span{overflow-wrap:anywhere}
.sp-btn{display:inline-block;padding:18px 36px;font-weight:800;font-size:18px;text-decoration:none;border-radius:var(--sp-r);box-shadow:0 10px 24px -10px rgba(0,0,0,.45);transition:transform .15s;cursor:pointer;border:0}
.sp-btn:hover{transform:translateY(-2px)}
.sp-hero{display:grid;gap:40px;align-items:center}
.sp-hero.has-img{grid-template-columns:1.1fr 1fr}
.sp-video{position:relative;padding-top:56.25%;border-radius:var(--sp-r);overflow:hidden;background:#000;margin:24px 0}
.sp-video iframe,.sp-video video{position:absolute;inset:0;width:100%;height:100%;border:0}
.sp-ph{display:grid;place-items:center;aspect-ratio:4/3;border-radius:var(--sp-r);background:var(--sp-card);opacity:.7;font-size:14px}
.sp-faq details{border-radius:var(--sp-r);background:var(--sp-card);padding:18px 20px;margin-top:12px;text-align:left}
.sp-faq summary{cursor:pointer;font-weight:700;list-style:none}
.sp-faq summary::-webkit-details-marker{display:none}
.sp-cd{display:flex;gap:12px;justify-content:center;margin:20px 0}
.sp-cd div{min-width:76px;padding:12px;border-radius:var(--sp-r);background:rgba(0,0,0,.18)}
.sp-cd b{display:block;font-size:34px;line-height:1}
.sp-cd small{font-size:11px;text-transform:uppercase;letter-spacing:.1em;opacity:.8}
.sp-check{display:flex;gap:10px;align-items:flex-start;padding:8px 0}
.sp-num{display:grid;place-items:center;width:40px;height:40px;border-radius:999px;font-weight:800;margin-bottom:12px}
@container (max-width:720px){
 .sp-grid,.sp-grid2,.sp-hero.has-img{grid-template-columns:1fr}
 .sp-wrap{padding:0 18px}
 .sp-btn{display:block;width:100%;padding:16px 20px;font-size:16px}
 .sp-root .sp-h:not([data-sp-custom-size]){font-size:calc(var(--sp-ts) * .72)!important}
 .sp-cd div{min-width:64px}.sp-cd b{font-size:26px}
}`;

export const COUNTDOWN_SCRIPT = `(function(){function t(){document.querySelectorAll('[data-sp-end]').forEach(function(el){var d=Math.max(0,new Date(el.getAttribute('data-sp-end')).getTime()-Date.now());var v=[Math.floor(d/864e5),Math.floor(d/36e5)%24,Math.floor(d/6e4)%60,Math.floor(d/1e3)%60];el.querySelectorAll('b').forEach(function(b,i){b.textContent=String(v[i]).padStart(2,'0')})})}t();setInterval(t,1000)})();`;

type Ctx = {
  settings: PageSettings;
  sections: PageSection[];
  onElementAction?: (sid: string, key: string, action: "hidden" | "removed") => void;
  editable: boolean;
  selectedElement?: string;
  onElementSelect?: (key: string) => void;
  onOrder?: (sectionId: string, order: string[], group?: string) => void;
  onText?: (sectionId: string, path: string, value: string) => void;
};

function resolveColor(v: string | undefined, s: PageSettings, fallback: string) {
  if (!v) return fallback;
  if (v === "surface") return s.colors.surface;
  if (v === "primary") return s.colors.primary;
  if (v === "bg") return s.colors.bg;
  return v;
}

function E({
  ctx,
  sid,
  path,
  value,
  as: Tag = "span",
  className,
  style,
}: {
  ctx: Ctx;
  sid: string;
  path: string;
  value: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  style?: CSSProperties;
}) {
  const override = ctx.sections.find(s => s.id === sid)?.elementStyles?.[path];
  style = { ...style, ...elementCss(override, ctx.settings), ...(override?.size !== undefined ? { "--sp-ts": `${override.size}px` } : {}) } as CSSProperties;
  const ref = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const n = ref.current;
    if (ctx.editable && n && document.activeElement !== n && n.innerText !== value) n.innerText = value;
  }, [value, ctx.editable]);
  if (!ctx.editable) {
    if (!value) return null;
    return (
      <Tag data-sp-custom-size={override?.size !== undefined || undefined} className={className} style={{ whiteSpace: "pre-line", ...style }}>
        {value}
      </Tag>
    );
  }
  return (
    <Tag
      ref={ref as never}
      className={className}
      data-sp-custom-size={override?.size !== undefined || undefined}
      style={{ whiteSpace: "pre-line", outline: "none", cursor: "text", minWidth: 20, display: Tag === "span" ? "inline-block" : undefined, ...style }}
      contentEditable
      suppressContentEditableWarning
      data-placeholder="Digite..."
      onInput={(e) => ctx.onText?.(sid, path, (e.currentTarget as HTMLElement).innerText)}
    />
  );
}

export function videoEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/^https?:\/\//.test(url)) return /\.(mp4|webm|m3u8)(\?|$)/i.test(url) ? { kind: "video", src: url } : { kind: "iframe", src: url };
  return null;
}

function safeHref(url: string | undefined) {
  const u = (url ?? "").trim();
  if (!u) return "#";
  if (u.startsWith("#") || /^https?:\/\//i.test(u) || /^mailto:|^tel:/i.test(u)) return u;
  return `https://${u}`;
}

function remaining(endAt: string) {
  const d = Math.max(0, new Date(endAt).getTime() - Date.now());
  return [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
}

function Countdown({ endAt }: { endAt: string }) {
  const [v, setV] = useState(() => remaining(endAt));
  useEffect(() => {
    setV(remaining(endAt));
    const t = setInterval(() => setV(remaining(endAt)), 1000);
    return () => clearInterval(t);
  }, [endAt]);
  const labels = ["dias", "horas", "min", "seg"];
  return (
    <div className="sp-cd" data-sp-end={endAt}>
      {v.map((n, i) => (
        <div key={i}>
          <b>{String(n).padStart(2, "0")}</b>
          <small>{labels[i]}</small>
        </div>
      ))}
    </div>
  );
}

function Section({ section, ctx }: { section: PageSection; ctx: Ctx }) {
  const s = ctx.settings;
  const st = section.style ?? {};
  const c = section.content ?? {};
  const items = (c.items ?? []) as Record<string, string>[];
  const bg = st.bg === "bg" || !st.bg ? (s.background ? "transparent" : s.colors.bg) : resolveColor(st.bg, s, s.colors.bg);
  const color = resolveColor(st.color, s, s.colors.text);
  const accent = resolveColor(st.accent, s, s.colors.primary);
  const btnBg = resolveColor(st.buttonBg, s, s.colors.primary);
  const btnColor = resolveColor(st.buttonColor, s, s.colors.buttonText);
  const align = st.align ?? "center";
  const ts = st.titleSize ?? (section.type === "hero" ? 48 : 34);
  const isDark = isDarkColor(bg);
  const card = isDark ? "rgba(255,255,255,.06)" : bg === s.colors.surface ? s.colors.bg : s.colors.surface;
  const font = st.font || s.font;
  const sid = section.id;
  const P = (path: string, v: string, props: Partial<Parameters<typeof E>[0]> = {}) => (
    <E ctx={ctx} sid={sid} path={path} value={v ?? ""} {...props} />
  );
  const title = (key = "title") =>
    (c[key] || ctx.editable) && P(key, c[key], { as: "h2", className: "sp-h", style: { fontSize: ts, fontFamily: `'${st.font || s.headingFont}', sans-serif`, fontWeight: st.weight ?? 800 } });
  const button = () => sectionButtons(section).map((b, i) => { const destination = buttonDestination(b, ctx.sections); return (
    <div key={b.id} data-sp-key={`button:${b.id}`} style={{ marginTop: 28 }}>
      <a className="sp-btn" data-sp-popular={destination.popular || undefined} href={destination.href} target={destination.href.startsWith("#") ? undefined : "_top"} aria-disabled={!!destination.warning} title={destination.warning}
        style={{ background: b.variant === "outline" || b.variant === "text" ? "transparent" : resolveColor(b.bg, s, btnBg), color: resolveColor(b.color, s, b.variant === "outline" ? resolveColor(b.bg, s, btnBg) : btnColor), border: b.variant === "outline" ? `2px solid ${resolveColor(b.bg, s, btnBg)}` : undefined, boxShadow: b.variant === "text" ? "none" : undefined, borderRadius: b.radius ?? s.radius, fontSize: b.size ?? 18, fontFamily: `'${st.font || s.headingFont}', sans-serif`, ...elementCss(section.elementStyles?.[`button:${b.id}`], s) }}
        onClick={ctx.editable || destination.warning ? (e) => e.preventDefault() : undefined}>
        {P(Array.isArray(c.buttons) ? `buttons.${i}.text` : "buttonText", b.text)}
      </a>
      {b.guarantee && <div className="sp-purchase-badge"><GuaranteeBadge badge={b.guarantee} id={`${sid}-${b.id}`}/></div>}
    </div>
  ); });
  const img = (key: string, ph = "Adicione uma imagem") =>
    c[key] ? (
      <img data-sp-key={key} src={c[key]} alt="" style={{ borderRadius: s.radius, width: "100%", height: "auto" }} loading="lazy" />
    ) : ctx.editable ? (
      <div data-sp-key={key} className="sp-ph">{ph}</div>
    ) : null;

  let body: React.ReactNode = null;
  switch (section.type) {
    case "announcement":
      body = <div data-sp-announcement data-mode={c.mode || (c.showDate ? "date" : "text")} data-expiry={c.expiry || "text"} data-expired-text={c.expiredText || "Oferta encerrada"}><div data-sp-announcement-main>{P("text", c.text, { as: "p", className: "sp-p", style: { fontWeight: 700, display: "inline" } })}{(c.mode === "date" || c.showDate === true || c.showDate === "true") && (c.dateAutomatic !== "false" ? <span className="sp-today" data-sp-today>{ctx.editable ? new Date().toLocaleDateString("pt-BR") : ""}</span> : P("dateText", c.dateText || "", { style: { marginLeft: 8 } }))}{c.mode === "countdown" && <div data-sp-timer data-end={c.timerType === "duration" ? undefined : c.endAt} data-duration={c.timerType === "duration" ? Number(c.durationSeconds) || 3600 : undefined}><span data-sp-timer-value>00d 00h 00m 00s</span></div>}</div><p data-sp-expired hidden>{c.expiredText || "Oferta encerrada"}</p></div>;
      break;
    case "hero":
      body = (
        <div className={`sp-hero ${c.image || ctx.editable ? "has-img" : ""}`} style={{ textAlign: align }}>
          <div>
            {(c.eyebrow || ctx.editable) && P("eyebrow", c.eyebrow, { as: "p", className: "sp-p", style: { color: accent, fontWeight: 800, letterSpacing: ".12em", fontSize: 13, marginBottom: 12 } })}
            {c.highlight && !ctx.editable && String(c.title).includes(c.highlight) ? <h2 className="sp-h" style={{ fontSize: ts, fontFamily: st.font || s.headingFont }}>{String(c.title).split(c.highlight).map((part, i) => <span key={i}>{i > 0 && <em style={{ color: accent }}>{c.highlight}</em>}{part}</span>)}</h2> : title()}
            {P("subtitle", c.subtitle, { as: "p", className: "sp-p", style: { fontSize: (st.textSize ?? 18) + 1, opacity: 0.85 } })}
            {button()}
            {c.miniBadges && <div data-sp-key="miniBadges" className="sp-mini-badges sp-strip">{ctx.editable ? P("miniBadges", c.miniBadges) : String(c.miniBadges).split("\n").map((line, i) => <span key={i} className="sp-strip-item">{line}</span>)}</div>}
          </div>
          {img("image", "Imagem do produto (opcional)")}
        </div>
      );
      break;
    case "video": {
      const v = videoEmbed(c.videoUrl);
      body = (
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {title()}
          {v ? (
            <div data-sp-key="videoUrl" className="sp-video">
              {v.kind === "iframe" ? <iframe src={v.src} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="vídeo" /> : <video src={v.src} controls playsInline />}
            </div>
          ) : ctx.editable ? (
            <div data-sp-key="videoUrl" className="sp-ph" style={{ aspectRatio: "16/9", margin: "24px 0" }}>Cole o link do vídeo no painel</div>
          ) : null}
          {button()}
        </div>
      );
      break;
    }
    case "benefits":
      body = (
        <>
          {title()}
          <div className="sp-grid">
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-card">
                <div style={{ fontSize: 30, marginBottom: 10 }}>{P(`items.${i}.icon`, it.icon)}</div>
                {P(`items.${i}.title`, it.title, { as: "h3", style: { margin: "0 0 6px", fontSize: 19 } })}
                {P(`items.${i}.text`, it.text, { as: "p", className: "sp-p", style: { opacity: 0.8 } })}
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "pains":
      body = (
        <>
          {title()}
          <div style={{ maxWidth: 640, margin: "24px auto 0", textAlign: "left" }}>
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-check" style={{ fontSize: st.textSize ?? 18 }}>
                {(c.showIcon === true || c.showIcon === "true") && <span style={{ color: accent, fontWeight: 900 }}>{P(`items.${i}.icon`, it.icon || "✔")}</span>}
                {P(`items.${i}.text`, it.text)}
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "steps":
      body = (
        <>
          {title()}
          <div className="sp-grid">
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-card">
                <div className="sp-num" style={{ background: accent, color: s.colors.buttonText }}>{it.icon ? P(`items.${i}.icon`, it.icon) : i + 1}</div>
                {P(`items.${i}.title`, it.title, { as: "h3", style: { margin: "0 0 6px", fontSize: 19 } })}
                {P(`items.${i}.text`, it.text, { as: "p", className: "sp-p", style: { opacity: 0.8 } })}
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "testimonials":
      body = (
        <>
          {title()}
          <div className="sp-grid">
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-card">
                <div style={{ color: "#F59E0B", marginBottom: 8 }}>★★★★★</div>
                {P(`items.${i}.text`, it.text, { as: "p", className: "sp-p", style: { fontStyle: "italic" } })}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                  {it.image ? (
                    <img src={it.image} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 999, background: accent, color: s.colors.buttonText, display: "grid", placeItems: "center", fontWeight: 800 }}>
                      {(it.name || "?").charAt(0)}
                    </div>
                  )}
                  {P(`items.${i}.name`, it.name, { style: { fontWeight: 700 } })}
                </div>
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "beforeAfter":
      body = (
        <>
          {title()}
          <div className="sp-grid2">
            {(["before", "after"] as const).map((k) => (
              <div key={k}>
                {img(`${k}Image`, k === "before" ? "Imagem do antes" : "Imagem do depois")}
                {P(`${k}Label`, c[`${k}Label`], { as: "p", style: { fontWeight: 800, marginTop: 10, color: k === "after" ? accent : undefined } })}
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "offer":
      body = (
        <div data-sp-key="offerCard" className="sp-card sp-offer" style={{ maxWidth: 600, margin: "0 auto", padding: 36, border: `1px solid ${accent}`, background: card }} >
          {P("badge", c.badge || "", { className: "sp-offer-label", style: { background: accent, color: btnColor } })}
          {title()}
          <div style={{ textAlign: "left", margin: "16px 0" }}>
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-check">
                <span style={{ color: accent, fontWeight: 900 }}>{P(`items.${i}.icon`, it.icon || "✔")}</span>
                {P(`items.${i}.text`, it.text)}
              </div>
            ))}
          </div>
          {P("oldPrice", c.oldPrice, { as: "p", style: { textDecoration: "line-through", opacity: 0.6, margin: 0 } })}
          {P("price", c.price, { as: "p", style: { fontSize: 52, fontWeight: 900, color: accent, margin: "4px 0", lineHeight: 1.1 } })}
          {P("installments", c.installments, { as: "p", style: { opacity: 0.8, margin: 0 } })}
          {button()}
          {P("note", c.note, { as: "p", style: { fontSize: 13, opacity: 0.7, marginTop: 14 } })}
        </div>
      );
      break;
    case "bonus":
      body = (
        <>
          {title()}
          <div className="sp-grid2">
            {items.map((it, i) => (
              <div key={i} data-sp-key={`items.${i}`} className="sp-card" style={{ textAlign: "left", borderLeft: `4px solid ${accent}` }}>
                <div style={{ fontSize: 26 }}>🎁</div>
                {P(`items.${i}.title`, it.title, { as: "h3", style: { margin: "6px 0" } })}
                {P(`items.${i}.text`, it.text, { as: "p", className: "sp-p", style: { opacity: 0.8 } })}
                <p style={{ marginTop: 8, fontWeight: 700 }}>
                  Valor: <s style={{ opacity: 0.7 }}>{P(`items.${i}.value`, it.value)}</s> <span style={{ color: accent }}>GRÁTIS</span>
                </p>
              </div>
            ))}
          </div>
        </>
      );
      break;
    case "guarantee":
      body = (
        <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center", flexWrap: "wrap", textAlign: align }}>
          <div data-sp-key="guarantee-badge"><GuaranteeBadge badge={{ days: c.days, ...c.badge }} id={sid}/></div>
          <div style={{ maxWidth: 520 }}>
            {title()}
            {P("text", c.text, { as: "p", className: "sp-p", style: { opacity: 0.85 } })}
          </div>
        </div>
      );
      break;
    case "faq":
      body = (
        <div className="sp-faq" style={{ maxWidth: 760, margin: "0 auto" }}>
          {title()}
          {items.map((it, i) =>
            ctx.editable ? (
              <div key={i} data-sp-key={`items.${i}`} className="sp-card" style={{ marginTop: 12, textAlign: "left", background: card }}>
                {P(`items.${i}.q`, it.q, { as: "p", style: { fontWeight: 700, margin: 0 } })}
                {P(`items.${i}.a`, it.a, { as: "p", className: "sp-p", style: { opacity: 0.8, marginTop: 8 } })}
              </div>
            ) : (
              <details key={i} data-sp-key={`items.${i}`} style={{ background: card }}>
                <summary>{P(`items.${i}.q`, it.q)}</summary>
                {P(`items.${i}.a`, it.a, { as: "p", className: "sp-p", style: { opacity: 0.8, marginTop: 10 } })}
              </details>
            ),
          )}
        </div>
      );
      break;
    case "countdown":
      body = (
        <>
          {title()}
          <Countdown endAt={c.endAt} />
          {button()}
        </>
      );
      break;
    case "text":
      body = (
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {title()}
          {P("body", c.body, { as: "p", className: "sp-p" })}
        </div>
      );
      break;
    case "image":
      body = (
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {img("image")}
          {(c.caption || ctx.editable) && P("caption", c.caption, { as: "p", style: { fontSize: 14, opacity: 0.7, marginTop: 10 } })}
        </div>
      );
      break;
    case "cta":
      body = (
        <>
          {(c.title || ctx.editable) && P("title", c.title, { as: "p", style: { fontSize: 20, fontWeight: 700, margin: 0 } })}
          {button()}
          {(c.note || ctx.editable) && P("note", c.note, { as: "p", style: { fontSize: 13, opacity: 0.7, marginTop: 12 } })}
        </>
      );
      break;
    case "footer":
      body = P("text", c.text, { as: "p", className: "sp-p" });
      break;
    default:
      body = ExtendedSection({ section, sections: ctx.sections, editable: ctx.editable, accent, buttonColor: btnColor, text: P, title, buttons: button, image: img });
  }

  const custom = (section.customElements ?? []).map(el => {
    const key = `custom:${el.id}`;
    if (el.type === "text" || el.type === "icon") return <div key={key}>{P(key, el.value, { as: "p" })}</div>;
    if (el.type === "image") return <div key={key} data-sp-key={key}>{el.value ? <img src={el.value} alt=""/> : <div className="sp-ph">Sua imagem</div>}</div>;
    if (el.type === "video") { const v = videoEmbed(el.value); return <div key={key} data-sp-key={key} className="sp-video">{v?.kind === "video" ? <video src={v.src} controls playsInline/> : v ? <iframe src={v.src} title="Vídeo" allowFullScreen/> : <div className="sp-ph">Seu vídeo</div>}</div>; }
    const destination = buttonDestination(el.button ?? { id: el.id, text: el.value, url: "" }, ctx.sections);
    return <a key={key} data-sp-key={key} data-sp-popular={destination.popular || undefined} href={destination.href} target={destination.href.startsWith("#") ? undefined : "_top"} className="sp-btn" style={{ background: accent, color: btnColor }} onClick={ctx.editable || destination.warning ? e => e.preventDefault() : undefined}>{P(key, el.value)}</a>;
  });
  body = <>{body}{custom}</>;
  function decorate(node: React.ReactNode, parent = "root"): React.ReactNode {
    const children = Children.toArray(node);
    const entries = children.map((child, index) => {
      if (!isValidElement<Record<string, any>>(child)) return { key: `static-${index}`, node: child };
      const p = child.props;
      const key = child.type === E ? p.path : p["data-sp-key"] || (p.className === "sp-grid" || p.className === "sp-grid2" || p.className === "sp-flex-grid" ? "items" : child.type === Countdown ? "countdown" : p.className?.split(" ").includes("sp-card") || p.className === "sp-check" ? `${parent}.item.${index}` : undefined);
      const group = key || `${parent}.${index}`;
      let next = p.children && child.type !== E ? cloneElement(child, {}, decorate(p.children, group)) : child;
      if (!key) return { key: `static-${index}`, node: next };
      const override = section.elementStyles?.[key];
      if (override?.hidden || override?.removed) return { key, node: null };
      if (child.type !== E) next = cloneElement(next, { style: { ...p.style, ...elementCss(override, s) } });
      return { key, node: ctx.editable ? <SectionElement key={key} sid={sid} elementKey={key} group={parent} ctx={{ ...ctx, onOrder: (sid, order) => ctx.onOrder?.(sid, order, parent) }} order={() => entries.filter(e => !e.key.startsWith("static-")).map(e => e.key)}>{next}</SectionElement> : next };
    });
    const order = section.groupOrders?.[parent];
    if (order) entries.sort((a, b) => (order.indexOf(a.key) < 0 ? 999 : order.indexOf(a.key)) - (order.indexOf(b.key) < 0 ? 999 : order.indexOf(b.key)));
    return entries.map(e => e.node);
  }
  // Preserve the older explicitly flattened layout, while new nested ordering stays within its parent.
  let output: React.ReactNode;
  if (section.elementOrder) {
    const slots: { key: string; node: React.ReactNode }[] = [];
    const collect = (node: React.ReactNode) => Children.forEach(node, child => {
      if (!isValidElement<Record<string, any>>(child)) return;
      const p = child.props; const key = child.type === E ? p.path : p["data-sp-key"];
      if (key) slots.push({ key, node: child }); else if (p.children) collect(p.children);
    });
    collect(body);
    const order = [...section.elementOrder.filter(k => slots.some(x => x.key === k)), ...slots.map(x => x.key).filter(k => !section.elementOrder?.includes(k))];
    output = <div className="sp-ordered">{order.map(key => <div key={key}>{decorate(slots.find(x => x.key === key)?.node, "root")}</div>)}</div>;
  } else output = decorate(body);
  return (
    <section id={`sp-section-${sid}`}
      style={{
        background: st.background ? pageBackground({ ...s, colors: { ...s.colors, bg: resolveColor(st.bg, s, s.colors.bg) }, background: st.background }) : bg,
        color,
        fontFamily: `'${font}', sans-serif`,
        fontSize: st.textSize ?? 17,
        fontWeight: st.weight,
        ["--sp-gap" as string]: `${st.gap ?? 20}px`,
        ["--sp-columns" as string]: Math.max(2, Math.min(4, st.columns ?? 3)),
        padding: `${st.paddingY ?? 64}px 0`,
        textAlign: align,
        ["--sp-card" as string]: card,
        ["--sp-ts" as string]: `${ts}px`,
      }}
    >
      <div className="sp-wrap" style={{ maxWidth: st.maxWidth ?? s.maxWidth }}>
        {output}
      </div>
    </section>
  );
}

function SectionElement({ sid, elementKey, group, ctx, order, children }: { sid: string; elementKey: string; group: string; ctx: Ctx; order: () => string[]; children: React.ReactNode }) {
  const selected = ctx.selectedElement === `${sid}:${elementKey}`;
  const [drop, setDrop] = useState<"before" | "after" | undefined>();
  const move = (delta: number) => {
    const keys = order(); const i = keys.indexOf(elementKey); const j = i + delta;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]]; ctx.onOrder?.(sid, keys);
  };
  return <div className="sp-element" data-element-key={elementKey} data-element-group={group} data-selected={selected} data-drop={drop}
    onClick={e => { e.stopPropagation(); ctx.onElementSelect?.(`${sid}:${elementKey}`); }}
    onDragOver={e => { if (!e.dataTransfer.types.includes("application/modelads-element")) return; e.preventDefault(); e.stopPropagation(); setDrop(e.clientY < e.currentTarget.getBoundingClientRect().top + e.currentTarget.offsetHeight / 2 ? "before" : "after"); }}
    onDragLeave={() => setDrop(undefined)} onDrop={e => {
      e.preventDefault(); e.stopPropagation(); setDrop(undefined);
      try { const from = JSON.parse(e.dataTransfer.getData("application/modelads-element")); if (from.sid !== sid || from.group !== group || from.key === elementKey) return;
        const keys = order().filter(k => k !== from.key); const i = keys.indexOf(elementKey); keys.splice(i + (drop === "after" ? 1 : 0), 0, from.key); ctx.onOrder?.(sid, keys);
      } catch { /* Ignore foreign drags. */ }
    }}>
    {children}
    {selected && <div className="sp-element-tools" onClick={e => e.stopPropagation()}>
      <Button size="icon" variant="ghost" title="Arrastar elemento" aria-label="Arrastar elemento" style={{ touchAction: "none", cursor: "grab" }} onPointerDown={e => {
        e.preventDefault(); e.stopPropagation();
        const sectionRoot = e.currentTarget.closest('[data-section-id]');
        if (!sectionRoot) return;
        let targetKey: string | undefined; let after = false;
        const clear = () => sectionRoot.querySelectorAll('[data-drop]').forEach(el => el.removeAttribute('data-drop'));
        const track = (event: PointerEvent) => {
          clear();
          let target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-element-key]');
          while (target && target.dataset.elementGroup !== group) target = target.parentElement?.closest<HTMLElement>('[data-element-key]');
          if (!target || !sectionRoot.contains(target) || target.dataset.elementKey === elementKey) { targetKey = undefined; return; }
          targetKey = target.dataset.elementKey;
          const rect = target.getBoundingClientRect(); after = event.clientY > rect.top + rect.height / 2;
          target.dataset.drop = after ? 'after' : 'before';
        };
        const finish = () => {
          clear(); window.removeEventListener('pointermove', track); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', cancel);
          if (!targetKey || !order().includes(targetKey)) return;
          const keys = order().filter(k => k !== elementKey); const i = keys.indexOf(targetKey);
          if (i >= 0) { keys.splice(i + (after ? 1 : 0), 0, elementKey); ctx.onOrder?.(sid, keys); }
        };
        const cancel = () => { targetKey = undefined; finish(); };
        window.addEventListener('pointermove', track); window.addEventListener('pointerup', finish, { once: true }); window.addEventListener('pointercancel', cancel, { once: true });
      }}><GripVertical size={14}/></Button>
      <Button size="icon" variant="ghost" title="Subir elemento" aria-label="Subir elemento" onClick={() => move(-1)}><ArrowUp size={14}/></Button>
      <Button size="icon" variant="ghost" title="Descer elemento" aria-label="Descer elemento" onClick={() => move(1)}><ArrowDown size={14}/></Button>
      <Button size="icon" variant="ghost" title="Ocultar elemento" aria-label="Ocultar elemento" onClick={() => ctx.onElementAction?.(sid, elementKey, "hidden")}><EyeOff size={14}/></Button>
      <Button size="icon" variant="ghost" title="Remover elemento" aria-label="Remover elemento" onClick={() => ctx.onElementAction?.(sid, elementKey, "removed")}><Trash2 size={14}/></Button>
    </div>}
  </div>;
}

export function isDarkColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? "");
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l < 0.5;
}

export function PageRenderer({
  sections,
  settings,
  editable = false,
  selectedId,
  onSelect,
  onText,
  onOrder,
  onElementSelect: externalSelect,
  onElementAction,
}: {
  sections: PageSection[];
  settings: PageSettings;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onText?: Ctx["onText"];
  onOrder?: Ctx["onOrder"];
  onElementSelect?: (sid: string, key: string) => void;
  onElementAction?: Ctx["onElementAction"];
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!root.current || editable) return; return installPageInteractions(root.current); }, [sections, editable]);
  const [selectedElement, onElementSelect] = useState<string>();
  const ctx: Ctx = { settings, sections, editable, onText, onOrder, onElementAction, selectedElement, onElementSelect: key => { onElementSelect(key); const sid = sections.find(s => key.startsWith(`${s.id}:`))?.id; if (sid) externalSelect?.(sid, key.slice(sid.length + 1)); } };
  const visible = sections.filter((s) => !s.hidden);
  return (
    <div ref={root} className="sp-root" style={{ background: pageBackground(settings), color: settings.colors.text, ["--sp-r" as string]: `${settings.radius}px` }}>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS + EXTENDED_PAGE_CSS }} />
      {visible.length === 0 && editable && (
        <div style={{ padding: "120px 24px", textAlign: "center", opacity: 0.6, fontFamily: "sans-serif" }}>
          Página vazia. Adicione seções pela biblioteca à esquerda.
        </div>
      )}
      {visible.map((sec) =>
        editable ? (
          <div
            key={sec.id}
            data-section-id={sec.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(sec.id);
            }}
            style={{ position: "relative", outline: selectedId === sec.id ? "2px solid #6D7CFF" : undefined, outlineOffset: -2, cursor: "pointer" }}
            className="sp-editable-section"
          >
            {selectedId === sec.id && (
              <span style={{ position: "absolute", top: 0, left: 0, zIndex: 2, background: "#6D7CFF", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", fontFamily: "sans-serif" }}>
                {BLOCK_MAP[sec.type]?.label}
              </span>
            )}
            <Section section={sec} ctx={ctx} />
          </div>
        ) : (
          <Section key={sec.id} section={sec} ctx={ctx} />
        ),
      )}
    </div>
  );
}
