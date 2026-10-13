import { BLOCK_MAP, uid, type PageBackground, type PageButton, type PageSection, type PageSettings } from "./sales-page-types";

export function sectionButtons(section: PageSection): PageButton[] {
  if (Array.isArray(section.content.buttons)) return section.content.buttons;
  return BLOCK_MAP[section.type]?.hasButton && section.content.buttonText
    ? [{ id: "legacy", text: section.content.buttonText, url: section.content.buttonUrl || "" }]
    : [];
}

export function newPageButton(): PageButton {
  return { id: uid(), text: "QUERO SABER MAIS", url: "", variant: "solid" };
}

export const DEFAULT_PAGE_BACKGROUND: PageBackground = {
  type: "solid", gradientType: "linear", stops: [{ color: "#ffffff", position: 0 }, { color: "#dbeafe", position: 100 }],
  angle: 135, centerX: 50, centerY: 50, image: "",
};

export function pageBackground(settings: PageSettings): string {
  const b = settings.background;
  if (!b || b.type === "solid") return settings.colors.bg;
  if (b.type === "image") return /^https?:\/\//i.test(b.image) ? `url(${JSON.stringify(b.image)}) center / cover no-repeat` : settings.colors.bg;
  const stops = b.stops.filter(s => /^#[0-9a-f]{6}$/i.test(s.color)).map(s => `${s.color} ${Math.max(0, Math.min(100, s.position))}%`).join(", ");
  if (b.stops.length < 2 || !stops) return settings.colors.bg;
  return b.gradientType === "radial"
    ? `radial-gradient(circle at ${b.centerX}% ${b.centerY}%, ${stops})`
    : `linear-gradient(${b.angle}deg, ${stops})`;
}

const PUBLISHED_ORIGIN = "https://modelads-spy.lovable.app";
export function salesPageUrl(slug: string, origin = typeof window === "undefined" ? PUBLISHED_ORIGIN : window.location.origin) {
  const host = new URL(origin).hostname;
  const preview = host === "localhost" || host === "127.0.0.1" || host.startsWith("id-preview--") || host.includes("preview") || host.endsWith("lovableproject.com");
  return `${preview ? PUBLISHED_ORIGIN : origin}/p/${encodeURIComponent(slug)}`;
}

export async function generateSalesPagePlaceholder(description: string) {
  return { status: "coming_soon" as const, description: description.trim() };
}