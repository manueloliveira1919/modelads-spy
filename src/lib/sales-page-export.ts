import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COUNTDOWN_SCRIPT, PageRenderer } from "@/components/sales-page/page-renderer";
import type { PageSection, PageSettings } from "./sales-page-types";

export const PAGE_FONTS = [
  "Inter", "Poppins", "Montserrat", "Roboto", "Open Sans", "Lato", "Nunito", "Raleway", "Oswald", "Playfair Display", "Merriweather", "Bebas Neue",
];

export function pageFontsHref(settings: PageSettings, sections: PageSection[]) {
  const fams = new Set([settings.font, settings.headingFont, ...sections.map((s) => s.style?.font).filter(Boolean) as string[]]);
  const q = [...fams].filter((f) => PAGE_FONTS.includes(f)).map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700;800;900`).join("&");
  return q ? `https://fonts.googleapis.com/css2?${q}&display=swap` : null;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildPageHtml(name: string, settings: PageSettings, sections: PageSection[]) {
  const body = renderToStaticMarkup(createElement(PageRenderer, { sections, settings }));
  const fonts = pageFontsHref(settings, sections);
  const title = settings.seo.title || name;
  const meta = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    settings.seo.description && `<meta name="description" content="${esc(settings.seo.description)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    settings.seo.description && `<meta property="og:description" content="${esc(settings.seo.description)}">`,
    settings.seo.image && `<meta property="og:image" content="${esc(settings.seo.image)}">`,
    settings.favicon && `<link rel="icon" href="${esc(settings.favicon)}">`,
    fonts && `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fonts}">`,
    `<style>html,body{margin:0;padding:0;background:${settings.colors.bg}}html{scroll-behavior:smooth}</style>`,
  ].filter(Boolean).join("\n");
  return `<!doctype html>
<html lang="pt-BR">
<head>
${meta}
${settings.headScripts || ""}
</head>
<body>
${body}
<script>${COUNTDOWN_SCRIPT}</script>
${settings.bodyScripts || ""}
</body>
</html>`;
}

export function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
