import { useId } from "react";

export interface GuaranteeBadgeSettings {
  mode?: "default" | "image";
  image?: string;
  hidden?: boolean;
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
  const custom = /^#[0-9a-f]{6}$/i.test(badge.color ?? "") ? badge.color : undefined;
  if (badge.hidden) return null;
  if (badge.mode === "image") return badge.image ? <img className="sp-guarantee" src={badge.image} alt="Selo de garantia" style={{ width: size, maxWidth: "100%", height: "auto", objectFit: "contain" }}/> : null;
  return <svg className={`sp-guarantee sp-badge-${variant}`} style={{ width: size, maxWidth: "100%", height: "auto", ...(variant === "custom" && custom ? { "--sp-badge-base": custom } : {}) }} viewBox="0 0 240 240" role="img" aria-label={`${badge.days || "7"} dias — ${badge.topText || "Garantia incondicional"}`}>
    <defs>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--sp-badge-light)"/><stop offset=".3" stopColor="var(--sp-badge-base)"/><stop offset=".52" stopColor="var(--sp-badge-light)"/><stop offset=".7" stopColor="var(--sp-badge-base)"/><stop offset="1" stopColor="var(--sp-badge-dark)"/></linearGradient>
      <path id={`${prefix}-top`} d="M 38,120 A 82,82 0 0,1 202,120"/>
      <path id={`${prefix}-bottom`} d="M 34,130 A 87,87 0 0,0 206,130"/>
    </defs>
    <circle cx="120" cy="120" r="110" fill={`url(#${prefix}-metal)`}/>
    <circle cx="120" cy="120" r="100" fill="var(--sp-badge-center)" stroke="var(--sp-badge-ink)" strokeWidth="1"/>
    <circle cx="120" cy="120" r="88" fill="none" stroke="var(--sp-badge-ink)" strokeWidth=".8" opacity=".4"/>
    <g fill="var(--sp-badge-ink)" fontFamily="Arial, sans-serif" textAnchor="middle">
      <text x="120" y="62" fontSize="18">✓</text>
      <text x="120" y="127" fontSize="64" fontWeight="800">{String(badge.days || "7").slice(0, 3)}</text>
      <text x="120" y="154" fontSize="17" fontWeight="700">DIAS</text>
      <text x="120" y="181" fontSize="12" fontWeight="700" textLength={badge.topText && badge.topText.length > 20 ? 150 : undefined} lengthAdjust="spacingAndGlyphs">{badge.topText || "GARANTIA"}</text>
    </g>
  </svg>;
}
