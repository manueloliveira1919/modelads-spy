import type { CSSProperties } from "react";
import type { ElementStyle, PageButton, PageSection, PageSettings } from "./sales-page-types";
import { pageBackground } from "./sales-page-layout";

/** One visible sibling sequence is shared by rendering, arrows and dragging. */
export function resolveElementOrder(available: string[], saved: string[] = []): string[] {
  const keys = [...new Set(available)];
  return [...new Set(saved)].filter(key => keys.includes(key)).concat(keys.filter(key => !saved.includes(key)));
}

export function moveElementOrder(keys: string[], key: string, target: string, after = false): string[] {
  if (key === target || !keys.includes(key) || !keys.includes(target)) return keys;
  const next = keys.filter(value => value !== key);
  next.splice(next.indexOf(target) + (after ? 1 : 0), 0, key);
  return next;
}

export function parseDestination(value: unknown): PageButton["destination"] {
  if (!value) return undefined;
  try { const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && ["url", "section", "whatsapp", "popular"].includes(parsed.type) ? parsed : undefined;
  } catch { return undefined; }
}

export function elementCss(style: ElementStyle = {}, settings: PageSettings): CSSProperties {
  const css: CSSProperties = {
    fontFamily: style.font ? `'${style.font}', sans-serif` : undefined, fontSize: style.size,
    fontWeight: style.weight, fontStyle: style.italic === undefined ? undefined : style.italic ? "italic" : "normal",
    lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, color: style.color, textAlign: style.align,
    marginTop: style.marginTop, marginBottom: style.marginBottom, marginLeft: style.marginX, marginRight: style.marginX,
    paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, paddingLeft: style.paddingX, paddingRight: style.paddingX,
    background: style.background ? pageBackground({ ...settings, colors: { ...settings.colors, bg: style.bg || settings.colors.surface }, background: style.background }) : style.bg,
    borderColor: style.borderColor, borderWidth: style.borderWidth, borderStyle: style.borderWidth !== undefined || style.borderColor ? "solid" : undefined,
    borderRadius: style.radius, width: style.width === undefined ? undefined : `${style.width}%`, maxWidth: "100%",
    ...(style.align === "center" && style.width !== undefined ? { marginLeft: "auto", marginRight: "auto" } : style.align === "right" && style.width !== undefined ? { marginLeft: "auto", marginRight: 0 } : {}),
  };
  return Object.fromEntries(Object.entries(css).filter(([, value]) => value !== undefined));
}

export function popularPlan(sections: PageSection[]) {
  for (const section of sections.filter(s => !s.hidden && s.type === "pricingPlans")) {
    const items = section.content.items ?? [];
    const index = section.content.popularPlan !== undefined ? Number(section.content.popularPlan) : items.findIndex(it => it.highlighted === "true");
    if (items[index] && !section.elementStyles?.[`items.${index}`]?.removed && !section.elementStyles?.[`items.${index}`]?.hidden) return { section, index, item: items[index], id: `sp-plan-${section.id}-${index}` };
  }
  return null;
}

export function buttonDestination(button: PageButton, sections: PageSection[]): { href: string; warning?: string; popular?: boolean } {
  const dest = button.destination;
  const safe = (raw: string) => /^(https?:\/\/|mailto:|tel:)/i.test(raw) ? raw : raw && !/^[a-z][a-z\d+.-]*:/i.test(raw) ? `https://${raw}` : "#";
  if (!dest || dest.type === "url") {
    const raw = button.url.trim();
    if (raw.startsWith("#")) {
      const section = sections.find(s => !s.hidden && (raw === `#sp-section-${s.id}` || raw === "#oferta" && (s.type === "offer" || s.type === "pricingPlans")));
      return section ? { href: `#sp-section-${section.id}` } : { href: "#", warning: "A seção de destino não existe ou está oculta." };
    }
    return raw ? { href: safe(raw), ...(safe(raw) === "#" ? { warning: "URL inválida." } : {}) } : { href: "#", warning: "Informe o destino do botão." };
  }
  if (dest.type === "whatsapp") {
    const phone = (dest.phone || "").replace(/\D/g, "");
    return phone.length >= 10 ? { href: `https://wa.me/${phone}?text=${encodeURIComponent(dest.message || "")}` } : { href: "#", warning: "Informe o número com código do país e DDD." };
  }
  if (dest.type === "section") {
    const section = sections.find(s => s.id === dest.sectionId && !s.hidden);
    return section ? { href: `#sp-section-${section.id}` } : { href: "#", warning: "A seção de destino não existe ou está oculta." };
  }
  const plan = popularPlan(sections);
  if (!plan) return { href: "#", warning: "Escolha um plano popular em uma seção de planos." };
  if (dest.popularAction === "checkout") return plan.item.buttonUrl ? { href: safe(plan.item.buttonUrl) } : { href: "#", warning: "O plano popular está sem link de compra." };
  return { href: `#${plan.id}`, popular: true };
}

export function contentAt(section: PageSection, key: string): string {
  if (key.startsWith("custom:")) return section.customElements?.find(e => e.id === key.slice(7))?.value || "";
  if (key.startsWith("button:")) return section.content.buttons?.find((b: PageButton) => b.id === key.slice(7))?.text || section.content.buttonText || "";
  const list = key.match(/^items\.(\d+)\.(features|checklist|excluded)\.(\d+)$/);
  if (list) return (section.content.items?.[Number(list[1])]?.[list[2]] || "").split("\n")[Number(list[3])] || "";
  return key.split(".").reduce<any>((value, part) => value?.[part], section.content) ?? "";
}
/** The explicit "Modo do aviso" wins; the legacy showDate flag only applies to bars saved before modes existed. */
export function announcementMode(content: Record<string, any>): "text" | "date" | "countdown" {
  if (content.mode === "text" || content.mode === "date" || content.mode === "countdown") return content.mode;
  return content.showDate === true || content.showDate === "true" ? "date" : "text";
}
