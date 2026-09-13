// Fase 3 — validação de captura, máscara de WhatsApp e destinos de CTA.

export type CtaKind = "none" | "url" | "whatsapp" | "checkout" | "sales";

export interface CtaConfig {
  cta: CtaKind;
  url: string;
  phone: string;
  message: string;
  target: "_self" | "_blank";
}

export function readCta(settings: Record<string, unknown>): CtaConfig {
  const kind = String(settings.cta ?? "none") as CtaKind;
  return {
    cta: (["none", "url", "whatsapp", "checkout", "sales"] as CtaKind[]).includes(kind)
      ? kind
      : "none",
    url: String(settings.ctaUrl ?? ""),
    phone: String(settings.ctaPhone ?? ""),
    message: String(settings.ctaMessage ?? ""),
    target: settings.ctaTarget === "_blank" ? "_blank" : "_self",
  };
}

export function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aceita números brasileiros com ou sem DDI (10 a 13 dígitos). */
export function isValidPhone(value: string): boolean {
  const d = normalizePhone(value);
  return d.length >= 10 && d.length <= 13;
}

export function maskPhone(value: string): string {
  let d = normalizePhone(value).slice(0, 13);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** Versão normalizada para armazenamento: DDI 55 + DDD + número. */
export function storablePhone(value: string): string {
  const d = normalizePhone(value);
  if (!d) return "";
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim());
}

/** Monta o destino final do CTA. Retorna null quando não há destino válido. */
export function ctaHref(cfg: CtaConfig): string | null {
  if (cfg.cta === "none") return null;
  if (cfg.cta === "whatsapp") {
    const digits = storablePhone(cfg.phone);
    if (!isValidPhone(cfg.phone)) return null;
    const text = cfg.message.trim() ? `?text=${encodeURIComponent(cfg.message.trim())}` : "";
    return `https://wa.me/${digits}${text}`;
  }
  return isValidUrl(cfg.url) ? cfg.url.trim() : null;
}
