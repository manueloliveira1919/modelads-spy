import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCKS, PAGE_TEMPLATES, DEFAULT_PAGE_SETTINGS, newSection } from "./sales-page-types";
import { pageBackground, salesPageUrl, sectionButtons } from "./sales-page-layout";
import { PageRenderer } from "@/components/sales-page/page-renderer";
import { buildPageHtml } from "./sales-page-export";
import { buttonDestination, elementCss, contentAt, parseDestination } from "./sales-page-elements";

describe("Sales page compatibility and output parity", () => {
  const recipes = () => {
    const template = PAGE_TEMPLATES.find(t => t.key === "natural-recipes");
    if (!template) throw new Error("Missing natural recipes template");
    return template.build();
  };
  it("starts the natural recipes offer with a fifteen-minute duration", () => {
    expect(recipes().find(s => s.type === "offer")?.content.durationSeconds).toBe("900");
  });
  it("uses a seven-day guarantee", () => {
    expect(recipes().find(s => s.type === "guarantee")?.content.days).toBe("7");
  });
  it("starts with five manually navigated carousel placeholders", () => {
    const carousel = recipes().find(s => s.type === "printCarousel");
    expect(carousel?.content.carouselMode).toBe("manual");
    expect(carousel?.content.items).toHaveLength(5);
  });
  it("defaults every recipes button to its own existing offer section", () => {
    const sections = recipes();
    const offer = sections.find(s => s.type === "offer");
    if (!offer) throw new Error("Missing offer");
    const buttons = sections.flatMap(sectionButtons);
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(buttonDestination(button, sections)).toEqual({ href: `#sp-section-${offer.id}` });
  });
  it("overrides one element without changing siblings and preserves parent structure", () => {
    const section = newSection("hero", { title: "Independent title", subtitle: "Unchanged sibling" });
    section.elementStyles = { title: { size: 42, color: "#123456", marginBottom: 24 } };
    const html = buildPageHtml("Overrides", DEFAULT_PAGE_SETTINGS, [section]);
    expect(html).toContain('font-size:42px');
    expect(html).toContain('margin-bottom:24px');
    expect(html).toContain("Unchanged sibling");
    section.elementStyles.title.hidden = true;
    expect(buildPageHtml("Hidden", DEFAULT_PAGE_SETTINGS, [section])).not.toContain("Independent title");
    expect(elementCss({}, DEFAULT_PAGE_SETTINGS)).not.toHaveProperty("fontSize");
  });
  it("resolves visible sections, WhatsApp and selected popular plans safely", () => {
    const plans = newSection("pricingPlans", { popularPlan: "1" });
    const completePlan = plans.content.items?.[1];
    if (!completePlan) throw new Error("Missing template plan");
    completePlan.buttonUrl = "https://example.com/checkout";
    const button = { id: "a", text: "Buy", url: "", destination: { type: "popular" as const } };
    expect(buttonDestination(button, [plans])).toEqual({ href: `#sp-plan-${plans.id}-1`, popular: true });
    expect(buttonDestination({ ...button, destination: { type: "popular", popularAction: "checkout" } }, [plans]).href).toBe("https://example.com/checkout");
    expect(buttonDestination({ ...button, destination: { type: "section", sectionId: plans.id } }, [plans]).href).toBe(`#sp-section-${plans.id}`);
    plans.hidden = true;
    expect(buttonDestination(button, [plans]).warning).toBeDefined();
    expect(buttonDestination({ ...button, destination: { type: "whatsapp", phone: "+55 (11) 99999-9999", message: "Olá & teste" } }, []).href).toContain("https://wa.me/5511999999999?text=Ol%C3%A1%20%26%20teste");
    expect(buttonDestination({ id: "x", text: "x", url: "javascript:alert(1)" }, []).href).toBe("#");
    expect(parseDestination("bad json")).toBeUndefined();
  });
  it("exports custom media, independent card backgrounds and nested content", () => {
    const offer = newSection("offer");
    offer.elementStyles = { offerCard: { bg: "#abcdef", radius: 20 }, price: { size: 61 } };
    offer.customElements = [{ id: "text", type: "text", value: "CUSTOM SAFE TEXT" }];
    const html = buildPageHtml("Offer", DEFAULT_PAGE_SETTINGS, [offer]);
    expect(html).toContain("background:#abcdef");
    expect(html).toContain("font-size:61px");
    expect(html).toContain("CUSTOM SAFE TEXT");
    const plans = newSection("pricingPlans");
    expect(contentAt(plans, "items.0.features.1")).toBe("Acesso imediato");
    const badge = newSection("guarantee", { badge: { mode: "image", image: "https://example.com/badge.png" } });
    expect(buildPageHtml("Image badge", DEFAULT_PAGE_SETTINGS, [badge])).toContain('src="https://example.com/badge.png"');
  });
  it("adds complete editable templates without changing legacy templates", () => {
    expect(PAGE_TEMPLATES).toHaveLength(9);
    for (const key of ["modern-purple"]) {
      const template = PAGE_TEMPLATES.find(t => t.key === key);
      expect(template).toBeDefined();
      if (!template) return;
      const sections = template.build();
      expect(new Set(sections.map(s => s.id)).size).toBe(sections.length);
      const html = buildPageHtml(template.name, { ...DEFAULT_PAGE_SETTINGS, ...template.settings }, sections);
      expect(html).toContain("sp-guarantee");
      expect(html).toContain("sp-bonus-image");
      expect(html).not.toContain("undefined");
      expect(sections.filter(s => ["hero", "image", "textPhoto"].includes(s.type)).every(s => !s.content.image)).toBe(true);
    }
  });
  it("serializes quiz/carousel interactions and isolates multiple guarantee SVG IDs", () => {
    const sections = [newSection("embeddedQuiz"), newSection("printCarousel"), newSection("guarantee"), newSection("guarantee")];
    const html = buildPageHtml("Interactive", DEFAULT_PAGE_SETTINGS, sections);
    expect(html).toContain("data-sp-question");
    expect(html).toContain("data-sp-action=\"option\"");
    expect(html).toContain("data-sp-action=\"next\"");
    expect(html).toContain("root.addEventListener");
    const ids = [...html.matchAll(/id="(guarantee-[^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("exports safe editable badge text, independent purchase seals and announcement dates", () => {
    const hero = newSection("hero", { buttons: [{ id: "buy", text: "Buy", url: "#oferta", guarantee: { days: "30", variant: "navy", size: 88, topText: "<script>" } }] });
    const html = buildPageHtml("Badge", DEFAULT_PAGE_SETTINGS, [hero, newSection("announcement", { mode: "date" })]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("sp-badge-navy");
    expect(html).toContain("width:88px");
    expect(html).toContain("data-sp-today");
  });
  it("preserves legacy buttons and permits removing all buttons", () => {
    const section = newSection("hero");
    expect(sectionButtons(section)[0]?.text).toBe(section.content.buttonText);
    section.content.buttons = [];
    expect(sectionButtons(section)).toEqual([]);
    expect(renderToStaticMarkup(createElement(PageRenderer, { sections: [section], settings: DEFAULT_PAGE_SETTINGS }))).not.toContain('class="sp-btn"');
  });
  it("uses independent button settings, order and links in exported HTML", () => {
    const section = newSection("hero", { title: "HEADLINE_MARKER", subtitle: "SUBTITLE_MARKER", buttons: [
      { id: "a", text: "FIRST_BUTTON", url: "https://example.com/a", bg: "#123456", color: "#abcdef", variant: "outline" },
      { id: "b", text: "SECOND_BUTTON", url: "#oferta", variant: "text" },
    ] });
    section.elementOrder = ["button:b", "subtitle", "button:a", "title"];
    const html = buildPageHtml("Test", DEFAULT_PAGE_SETTINGS, [section]);
    expect(html.indexOf("SECOND_BUTTON")).toBeLessThan(html.indexOf("SUBTITLE_MARKER"));
    expect(html.indexOf("SUBTITLE_MARKER")).toBeLessThan(html.indexOf("FIRST_BUTTON"));
    expect(html.indexOf("FIRST_BUTTON")).toBeLessThan(html.indexOf("HEADLINE_MARKER"));
    expect(html).toContain("2px solid #123456");
    expect(html).toContain('href="https://example.com/a"');
    expect(html).not.toContain('class="sp-element-tools"');
  });
  it("renders every legacy section type", () => {
    for (const block of BLOCKS) expect(() => buildPageHtml("Legacy", DEFAULT_PAGE_SETTINGS, [newSection(block.type)])).not.toThrow();
  });
  it("shares linear/radial and image backgrounds with export", () => {
    const settings = { ...DEFAULT_PAGE_SETTINGS, background: { type: "gradient" as const, gradientType: "linear" as const, angle: 90, centerX: 25, centerY: 75, image: "", stops: [{ color: "#123456", position: 0 }, { color: "#abcdef", position: 40 }, { color: "#ffffff", position: 100 }] } };
    expect(pageBackground(settings)).toBe("linear-gradient(90deg, #123456 0%, #abcdef 40%, #ffffff 100%)");
    expect(buildPageHtml("Test", settings, [])).toContain(pageBackground(settings));
    const radial = { ...settings, background: { ...settings.background, gradientType: "radial" as const } };
    expect(pageBackground(radial)).toContain("circle at 25% 75%");
    const image = { ...settings, background: { ...settings.background, type: "image" as const, image: "https://example.com/photo.jpg" } };
    expect(pageBackground(image)).toContain('url("https://example.com/photo.jpg")');
  });
  it("never shares the preview host and preserves published/custom origins", () => {
    expect(salesPageUrl("oferta", "http://localhost:8080")).toBe("https://modelads-spy.lovable.app/p/oferta");
    expect(salesPageUrl("oferta", "https://id-preview--test.lovable.app")).toBe("https://modelads-spy.lovable.app/p/oferta");
    expect(salesPageUrl("oferta", "https://modelads-spy.lovable.app")).toBe("https://modelads-spy.lovable.app/p/oferta");
    expect(salesPageUrl("oferta", "https://modelads.com.br")).toBe("https://modelads.com.br/p/oferta");
  });
  it("respects the announcement mode: text only, date only or countdown only", () => {
    const render = (content: Record<string, unknown>) => renderToStaticMarkup(createElement(PageRenderer, { sections: [newSection("announcement", content)], settings: DEFAULT_PAGE_SETTINGS }));
    const text = render({ mode: "text", showDate: true });
    expect(text).not.toContain("data-sp-today");
    expect(text).not.toContain("data-sp-timer");
    const date = render({ mode: "date" });
    expect(date).toContain("data-sp-today");
    expect(date).not.toContain("data-sp-timer");
    const countdown = render({ mode: "countdown", showDate: true });
    expect(countdown).toContain("data-sp-timer");
    expect(countdown).not.toContain("data-sp-today");
    expect(render({ mode: undefined, showDate: true })).toContain("data-sp-today");
  });
  it("lets the announcement date and countdown be hidden individually", () => {
    const section = newSection("announcement", { mode: "countdown" });
    section.elementStyles = { countdown: { hidden: true } };
    expect(renderToStaticMarkup(createElement(PageRenderer, { sections: [section], settings: DEFAULT_PAGE_SETTINGS }))).not.toContain("data-sp-timer");
  });
  it("replaces the old kids template with Atividades Kids and gives every template an emoji", () => {
    expect(PAGE_TEMPLATES.find(t => t.key === "education-kids")).toBeUndefined();
    expect(PAGE_TEMPLATES.every(t => t.emoji.trim().length > 0)).toBe(true);
    const kids = PAGE_TEMPLATES.find(t => t.name === "Infoprodutos Atividades Kids");
    expect(kids?.emoji).toBe("🧩");
    const sections = kids!.build();
    expect(sections.map(s => s.type)).toEqual(["announcement", "hero", "iconCards", "textPhoto", "textPhoto", "iconCards", "printCarousel", "testimonials", "iconCards", "pricingPlans", "guarantee", "faq", "finalCta", "footer"]);
    expect(sections[0].content.mode).toBe("countdown");
    const html = buildPageHtml(kids!.name, { ...DEFAULT_PAGE_SETTINGS, ...kids!.settings }, sections);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("data-sp-today");
    expect(html).toContain("Por apenas R$ 17,00");
    expect(html).toContain("sp-excluded");
    expect(html).toContain("<details open");
  });
});