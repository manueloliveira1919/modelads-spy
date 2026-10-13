import { QUIZ_FONTS } from "./quiz-visual";
import type { CSSProperties } from "react";

export interface TextRun { t: string; color?: string; font?: string; b?: boolean; i?: boolean; u?: boolean }
export function validColor(value: unknown): value is string { return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value); }
export function validFont(value: unknown): value is string { return typeof value === "string" && (QUIZ_FONTS as readonly string[]).includes(value); }
export function normalizeRuns(value: unknown): TextRun[] {
  if (!Array.isArray(value)) return [];
  const out: TextRun[] = [];
  for (const raw of value) {
    if (!raw || typeof raw.t !== "string" || !raw.t) continue;
    const run: TextRun = { t: raw.t };
    if (validColor(raw.color)) run.color = raw.color;
    if (validFont(raw.font)) run.font = raw.font;
    for (const k of ["b", "i", "u"] as const) if (raw[k] === true) run[k] = true;
    const last = out[out.length - 1];
    if (last && JSON.stringify({ ...last, t: "" }) === JSON.stringify({ ...run, t: "" })) last.t += run.t;
    else out.push(run);
  }
  return out;
}
export function runStyle(r: TextRun): CSSProperties {
  return { color: r.color, fontFamily: r.font ? `"${r.font}",system-ui,sans-serif` : undefined, fontWeight: r.b ? 700 : undefined, fontStyle: r.i ? "italic" : undefined, textDecoration: r.u ? "underline" : undefined };
}
function cssColor(value: string): string | undefined {
  if (validColor(value)) return value;
  const rgb = value.match(/^rgb\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)\s*\)$/);
  return rgb ? `#${rgb.slice(1).map(v => Math.min(255, Number(v)).toString(16).padStart(2, "0")).join("")}` : undefined;
}
export function readEditableRuns(root: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  const walk = (node: Node, inherited: Omit<TextRun, "t">) => {
    if (node.nodeType === Node.TEXT_NODE) { runs.push({ t: node.textContent ?? "", ...inherited }); return; }
    if (!(node instanceof HTMLElement)) return;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(node.tagName)) return;
    if (node.tagName === "BR") { runs.push({ t: "\n", ...inherited }); return; }
    const s = { ...inherited };
    if (node !== root) {
      const color = cssColor(node.style.color || node.getAttribute("color") || "");
      const font = (node.style.fontFamily || node.getAttribute("face") || "").replace(/["']/g, "").split(",")[0].trim();
      if (color) s.color = color;
      if (validFont(font)) s.font = font;
      if (["B", "STRONG"].includes(node.tagName) || Number(node.style.fontWeight) >= 600 || node.style.fontWeight === "bold") s.b = true;
      if (["I", "EM"].includes(node.tagName) || node.style.fontStyle === "italic") s.i = true;
      if (node.tagName === "U" || node.style.textDecoration.includes("underline")) s.u = true;
      if (["DIV", "P"].includes(node.tagName) && runs.length && !runs[runs.length - 1].t.endsWith("\n")) runs.push({ t: "\n" });
    }
    node.childNodes.forEach(n => walk(n, s));
  };
  walk(root, {});
  return normalizeRuns(runs);
}
export function clearRunProperty(content: Record<string, unknown>, key: keyof Omit<TextRun, "t">): Record<string, unknown> {
  const visit = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(visit);
    if (!v || typeof v !== "object") return v;
    const o = v as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      if (k.endsWith("Runs") || k === "runs") result[k] = normalizeRuns(val).map(r => { const next = { ...r }; delete next[key]; return next; });
      else result[k] = visit(val);
    }
    return result;
  };
  return visit(content) as Record<string, unknown>;
}