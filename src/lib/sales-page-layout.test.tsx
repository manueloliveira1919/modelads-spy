import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCKS, DEFAULT_PAGE_SETTINGS, newSection } from "./sales-page-types";
import { pageBackground, salesPageUrl, sectionButtons } from "./sales-page-layout";
import { PageRenderer } from "@/components/sales-page/page-renderer";
import { buildPageHtml } from "./sales-page-export";

describe("Sales page compatibility and output parity", () => {
  it("preserves legacy buttons and permits removing all buttons", () => {
    const section = newSection("hero");
    expect(sectionButtons(section)[0]?.text).toBe(section.content.buttonText);
    section.content.buttons = [];
    expect(sectionButtons(section)).toEqual([]);
    expect(renderToStaticMarkup(createElement(PageRenderer, { sections: [section], settings: DEFAULT_PAGE_SETTINGS }))).not.toContain('class="sp-btn"');
  });
  it("uses independent button settings, order and links in exported HTML", () => {
    const section = newSection("hero", { title: "TITLE_MARKER", subtitle: "SUBTITLE_MARKER", buttons: [
      { id: "a", text: "FIRST_BUTTON", url: "https://example.com/a", bg: "#123456", color: "#abcdef", variant: "outline" },
      { id: "b", text: "SECOND_BUTTON", url: "#oferta", variant: "text" },
    ] });
    section.elementOrder = ["button:b", "subtitle", "button:a", "title"];
    const html = buildPageHtml("Test", DEFAULT_PAGE_SETTINGS, [section]);
    expect(html.indexOf("SECOND_BUTTON")).toBeLessThan(html.indexOf("SUBTITLE_MARKER"));
    expect(html.indexOf("SUBTITLE_MARKER")).toBeLessThan(html.indexOf("FIRST_BUTTON"));
    expect(html.indexOf("FIRST_BUTTON")).toBeLessThan(html.indexOf("TITLE_MARKER"));
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
});