import { useId } from "react";

export interface GuaranteeBadgeSettings {
  days?: string;
  topText?: string;
  bottomText?: string;
  variant?: string;
  color?: string;
  size?: number;
}

/** Self-contained SVG: the same vector is serialized into downloaded/public HTML. */
export function GuaranteeBadge({ badge = {}, id }: { badge?: GuaranteeBadgeSettings; id?: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "");
  const prefix = `guarantee-${id ?? instance}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const size = Math.max(64, Math.min(320, Number(badge.size) || 180));
  const variant = ["gold", "navy", "green", "purple", "custom"].includes(badge.variant ?? "") ? badge.variant : "gold";
  const points = Array.from({ length: 96 }, (_, i) => {
    const a = i * Math.PI / 48 - Math.PI / 2;
    const r = i % 2 ? 103 : 110;
    return `${120 + Math.cos(a) * r},${120 + Math.sin(a) * r}`;
  }).join(" ");
  const custom = /^#[0-9a-f]{6}$/i.test(badge.color ?? "") ? badge.color : undefined;
  return <svg className={`sp-guarantee sp-badge-${variant}`} style={{ width: size, maxWidth: "100%", height: "auto", ...(variant === "custom" && custom ? { "--sp-badge-base": custom } : {}) }} viewBox="0 0 240 260" role="img" aria-label={`${badge.days || "7"} dias — ${badge.topText || "Garantia incondicional"}`}>
    <defs>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--sp-badge-light)"/><stop offset=".3" stopColor="var(--sp-badge-base)"/><stop offset=".52" stopColor="var(--sp-badge-light)"/><stop offset=".7" stopColor="var(--sp-badge-base)"/><stop offset="1" stopColor="var(--sp-badge-dark)"/></linearGradient>
      <path id={`${prefix}-top`} d="M 38,120 A 82,82 0 0,1 202,120"/>
      <path id={`${prefix}-bottom`} d="M 34,130 A 87,87 0 0,0 206,130"/>
    </defs>
    <polygon points={points} fill={`url(#${prefix}-metal)`}/>
    <circle cx="120" cy="120" r="95" fill="var(--sp-badge-center)" stroke="var(--sp-badge-ink)" strokeWidth="1"/>
    <circle cx="120" cy="120" r="72" fill="none" stroke="var(--sp-badge-ink)" strokeWidth=".8" opacity=".55"/>
    <g fill="var(--sp-badge-ink)" fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="700">
      <text fontSize="10.5" textLength="218" lengthAdjust="spacingAndGlyphs"><textPath href={`#${prefix}-top`} startOffset="50%">{badge.topText || "GARANTIA INCONDICIONAL"}</textPath></text>
      <text fontSize="10" textLength="226" lengthAdjust="spacingAndGlyphs"><textPath href={`#${prefix}-bottom`} startOffset="50%">{badge.bottomText || "SATISFAÇÃO GARANTIDA"}</textPath></text>
      <text x="120" y="87" fontSize="18">★</text>
      <text x="120" y="139" fontSize="56">{String(badge.days || "7").slice(0, 3)}</text>
      <text x="120" y="163" fontSize="17">DIAS</text>
    </g>
    <path d="M35 195 L68 184 L172 184 L205 195 L191 216 L200 237 L159 224 L81 224 L40 237 L49 216Z" fill={`url(#${prefix}-metal)`} stroke="var(--sp-badge-ink)" strokeWidth="1"/>
    <path d="M68 184 L81 224 L159 224 L172 184" fill="none" stroke="var(--sp-badge-ink)" opacity=".4"/>
    <text x="120" y="211" fill="var(--sp-badge-ink)" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="13" textAnchor="middle">✓ GARANTIA</text>
  </svg>;
}