import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuizElementView, quizSurfaceStyle } from "./quiz-element-view";
import { DEFAULT_QUIZ_SETTINGS, NEW_QUIZ_SETTINGS, makeElement } from "@/lib/quiz-types";
import { applyQuizTheme, QUIZ_THEMES } from "@/lib/quiz-themes";
import { mergeSettings } from "@/lib/quiz-api";
import { collectQuizFonts } from "@/lib/quiz-visual";
import { normalizeRuns, clearRunProperty } from "@/lib/quiz-rich-text";
const s = DEFAULT_QUIZ_SETTINGS;
describe("Shared quiz renderer compatibility", () => {
  it("renders safe runs and rejects user markup, unknown colors and fonts", () => {
    const runs = normalizeRuns([{ t: "safe", color: "#123456", font: "Oswald", b: true }, { t: "<script>alert(1)</script>", color: "url(evil)", font: "evil" }]);
    const el = makeElement("s", "text", 0, { text: runs.map(r => r.t).join(""), runs });
    const html = renderToStaticMarkup(<QuizElementView el={el} settings={s} percent={0} />);
    expect(html).toContain("Oswald"); expect(html).toContain("#123456"); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("url(evil)");
  });
  it("collects run fonts across labels and result parts", () => {
    const fonts = collectQuizFonts(s, [{ settings: { fontFamily: "Lato" }, content: { options: [{ runs: [{ t: "a", font: "Oswald" }] }], titleRuns: [{ t: "b", font: "Nunito" }] } }]);
    expect(fonts).toEqual(["Lato", "Nunito", "Oswald", "Poppins"]);
  });
  it("uses the same runs in button, option and result labels", () => {
    const runs = [{ t: "Trecho", color: "#123456", font: "Oswald", i: true }];
    for (const el of [makeElement("s", "button", 0, { label: "Trecho", runs }), makeElement("s", "options", 0, { options: [{ id: "x", label: "Trecho", runs }] }), makeElement("s", "result", 0, { title: "Trecho", titleRuns: runs }, { loading: false })]) {
      const html = renderToStaticMarkup(<QuizElementView el={el} settings={s} percent={100} />);
      expect(html).toContain("#123456"); expect(html).toContain("Oswald"); expect(html).toContain("font-style:italic");
    }
  });
  it("clears only the requested run override", () => {
    expect(clearRunProperty({ runs: [{ t: "x", color: "#123456", font: "Oswald", b: true }] }, "color")).toEqual({ runs: [{ t: "x", font: "Oswald", b: true }] });
  });
  it("keeps missing legacy result analysis off and enables analysis only in new blocks", () => {
    const el = makeElement("s", "result", 0);
    expect(el.settings.loading).toBe(true); expect(el.settings.loadingSeconds).toBe(5);
    el.settings = { chart: "bar" };
    const html = renderToStaticMarkup(<QuizElementView el={el} settings={s} percent={100} />);
    expect(html).not.toContain('role="status"'); expect(html).toContain("Seu resultado");
  });
  it("renders legacy text and styles without editor attributes", () => {
    const el = makeElement(
      "section",
      "text",
      0,
      { text: "Texto antigo" },
      {
        fontFamily: "Merriweather",
        weight: 800,
        lineHeight: 1.8,
        letterSpacing: 3,
        animation: "fade-up",
        animationDuration: 1.2,
        animationDelay: 0.4,
        size: 32,
        color: "#ABCD12",
        fontStyle: "italic",
        textDecoration: "underline",
      },
    );
    const html = renderToStaticMarkup(<QuizElementView el={el} settings={s} percent={20} />);
    expect(html).toContain("Texto antigo");
    expect(html).toContain("Merriweather");
    expect(html).toContain("font-weight:800");
    expect(html).toContain("line-height:1.8");
    expect(html).toContain("letter-spacing:3px");
    expect(html).toContain("quiz-animation-fade-up");
    expect(html).toContain("font-style:italic");
    expect(html).toContain("text-decoration:underline");
    expect(html).not.toContain("contentEditable");
  });
  it("keeps the same content in editor with inline editing enabled", () => {
    const el = makeElement("s", "text", 0, { text: "Texto editável" });
    expect(
      renderToStaticMarkup(<QuizElementView el={el} settings={s} percent={0} editable />),
    ).toContain('contentEditable="true"');
  });
  it("shows selected answer accessibly and preserves multiple answers", () => {
    const el = makeElement(
      "s",
      "options",
      0,
      {
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      },
      { selection: "multiple" },
    );
    const html = renderToStaticMarkup(
      <QuizElementView el={el} settings={s} percent={30} selectedOptions={["a", "b"]} />,
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain('data-multiple="true"');
  });
  it("renders stored field values and does not expose disabled fields", () => {
    const el = makeElement("s", "fields", 0, {
      fields: [
        { key: "name", label: "Nome", enabled: true },
        { key: "email", label: "Privado", enabled: false },
      ],
    });
    const html = renderToStaticMarkup(
      <QuizElementView el={el} settings={s} percent={80} fieldValues={{ name: "QA" }} />,
    );
    expect(html).toContain('value="QA"');
    expect(html).not.toContain("Privado");
  });
  it("keeps result range matching and placeholders in runtime but raw editor text", () => {
    const el = makeElement("s", "result", 0, {
      title: "Resultado {pontos}",
      description: "Total {percentual}",
      ranges: [
        {
          id: "r",
          min: 10,
          max: 20,
          title: "Faixa {pontos}",
          description: "Total {percentual}",
          percent: 90,
        },
      ],
    });
    el.settings.loading = false;
    const runtime = renderToStaticMarkup(
      <QuizElementView el={el} settings={s} percent={100} score={15} resultPercent={75} />,
    );
    expect(runtime).toContain("Faixa 15");
    expect(runtime).toContain("Total 90%");
    const editor = renderToStaticMarkup(
      <QuizElementView el={el} settings={s} percent={100} editable />,
    );
    expect(editor).toContain('data-result-part="title"');
    expect(editor).not.toContain("Faixa 75");
  });
  it("does not replace saved colors when loading older quizzes", () => {
    const merged = mergeSettings({
      colors: { primary: "#123456", text: "#654321" },
      button: { radius: 7 },
    });
    expect(merged.colors.primary).toBe("#123456");
    expect(merged.colors.text).toBe("#654321");
    expect(merged.button.radius).toBe(7);
    expect(mergeSettings(null).button.radius).toBe(12);
    expect(NEW_QUIZ_SETTINGS.button.radius).toBe(24);
  });
  it("provides six themes without mutating settings and propagates each saved palette", () => {
    expect(QUIZ_THEMES).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const themed = applyQuizTheme(i, s);
      expect(themed.colors.primary).toBe(QUIZ_THEMES[i].primary);
      expect(quizSurfaceStyle(themed)).toHaveProperty("--q-primary", themed.colors.primary);
    }
    expect(s.button.radius).toBe(12);
  });
});
