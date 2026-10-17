import { describe, expect, it } from "vitest";
import { parseQuizTemplate, materializeQuizTemplate, exportQuizTemplate, templateSettings, QUIZ_TEMPLATE_MAX_BYTES, QUIZ_AI_EXAMPLE, QUIZ_AI_INSTRUCTIONS, buildQuizAiPrompt } from "./quiz-template";
import { DEFAULT_QUIZ_SETTINGS, makeElement, uid, type QuizSection } from "./quiz-types";
import { answerKey } from "./quiz-session";
import { resolveNextIndex } from "./quiz-logic";
const base = () => ({ format: "modelads-quiz-template", version: 1, name: "Teste", settings: {}, sections: [{ key: "s1", name: "Capa", elements: [{ type: "text", content: { text: "Olá" }, settings: {} }] }] });
describe("Portable quiz template rules", () => {
  it("accepts BOM, markdown fences and surrounding prose without changing the template", () => {
    expect(parseQuizTemplate(`\uFEFFAqui está:\n\`\`\`json\n${JSON.stringify(base())}\n\`\`\`\nFim.`)).toEqual(parseQuizTemplate(base()));
  });
  it.each([ { funnel: {} }, { template: { sections: [] } }, { template_name: "Quiz" }, { questions: [] }, { entry: {} } ])("rejects generic or wrapped contracts with guide guidance: %j", value => {
    expect(() => parseQuizTemplate(value)).toThrow("parece gerado sem as instruções");
  });
  it("reports at most five validation failures with element context", () => {
    const t = { ...base(), sections: [{ ...base().sections[0], elements: Array.from({ length: 6 }, () => ({ type: "unknown", content: {}, settings: {} })) }] };
    try { parseQuizTemplate(t); throw new Error("Should reject"); } catch (e) {
      const lines = (e as Error).message.split("\n");
      expect(lines).toHaveLength(5);
      expect(lines[4]).toContain("Seção 1, elemento 5");
    }
  });
  it("imports the complete examples embedded in the instructions", () => {
    const first = QUIZ_AI_INSTRUCTIONS.split("\n").find(line => line.startsWith('{"format"'));
    expect(parseQuizTemplate(first).sections).toHaveLength(1);
    const parsed = parseQuizTemplate(QUIZ_AI_EXAMPLE);
    expect(parsed.sections).toHaveLength(3);
    expect(parsed.sections[0].elements[0].content.options?.[1].value).toBe(5);
    expect(parsed.sections[1].elements[0].content.ranges?.[1].min).toBe(5);
    expect(QUIZ_AI_INSTRUCTIONS).toContain(JSON.stringify(QUIZ_AI_EXAMPLE, null, 2));
  });
  it("includes the user request and shared instructions in the ready prompt", () => {
    const prompt = buildQuizAiPrompt("  Curso de maquiagem, 8 perguntas  ");
    expect(prompt).toContain(QUIZ_AI_INSTRUCTIONS);
    expect(prompt).toContain("PEDIDO DO USUÁRIO:\nCurso de maquiagem, 8 perguntas");
  });
  it("rejects invalid JSON", () => expect(() => parseQuizTemplate('{"name":')).toThrow("JSON inválido"));
  it("rejects unknown versions", () => expect(() => parseQuizTemplate({ ...base(), version: 2 })).toThrow("Versão"));
  it("reports unknown element with section and element numbers", () => { const t = base(); t.sections[0].elements[0].type = "xyz"; expect(() => parseQuizTemplate(t)).toThrow("Seção 1, elemento 1: tipo 'xyz' não existe"); });
  it("enforces 40 sections", () => expect(() => parseQuizTemplate({ ...base(), sections: Array.from({ length: 41 }, (_, i) => ({ ...base().sections[0], key: `s${i}` })) })).toThrow("40 seções"));
  it("enforces 60 elements per section", () => { const t = base(); t.sections[0].elements = Array.from({ length: 61 }, () => t.sections[0].elements[0]); expect(() => parseQuizTemplate(t)).toThrow("60 elementos"); });
  it("enforces 1 MB including unknown fields", () => expect(() => parseQuizTemplate({ ...base(), extra: "a".repeat(QUIZ_TEMPLATE_MAX_BYTES) })).toThrow("1 MB"));
  it.each(["javascript:alert(1)", "data:text/html,evil", "vbscript:evil", "//evil.example"])('rejects unsafe href %s even as an unknown field', href => expect(() => parseQuizTemplate({ ...base(), href })).toThrow(/link não permitido/i));
  it("permits only allowed protocols", () => { for (const url of ["https://example.com", "http://example.com", "tel:+5511999999999", "mailto:a@example.com"]) expect(parseQuizTemplate({ ...base(), sections: [{ ...base().sections[0], elements: [{ type: "button", content: {}, settings: { ctaUrl: url } }] }] }).sections[0].elements[0].settings.ctaUrl).toBe(url); });
  it("rejects non-hex colors", () => expect(() => parseQuizTemplate({ ...base(), settings: { colors: { primary: "red" } } })).toThrow("#rrggbb"));
  it("rejects unsupported fonts", () => expect(() => parseQuizTemplate({ ...base(), settings: { font: "Comic Sans" } })).toThrow("Fonte"));
  it("strips unknown keys and database identities", () => { const t = parseQuizTemplate({ ...base(), user_id: "private", slug: "private", leads: [], extra: "x" }); expect(t).not.toHaveProperty("user_id"); expect(t).not.toHaveProperty("slug"); expect(t).not.toHaveProperty("leads"); expect(t).not.toHaveProperty("extra"); });
  it("fills missing element and appearance fields with existing defaults", () => { const t = parseQuizTemplate(base()); const el = materializeQuizTemplate(t, "q")[0].elements[0]; expect(el.settings.size).toBe(17); expect(templateSettings(t)).toEqual(DEFAULT_QUIZ_SETTINGS); });
  it("remaps conditional targets and regenerates all nested identities without losing runs/results/delays", () => {
    const a = uid(), b = uid(), c = uid();
    const sections: QuizSection[] = [a, b, c].map((id, i) => ({ id, quiz_id: "q", type: "content", title: `Section ${i}`, position: i, settings: {}, elements: [] }));
    const runs = [{ t: "Avançar", font: "Oswald", b: true, color: "#123456" }];
    sections[0].elements = [makeElement(a, "options", 0, { options: [{ id: "old-option", label: "Avançar", runs, next: c, value: 3 }] })];
    sections[2].elements = [makeElement(c, "result", 0, { buttonText: "Avançar", buttonTextRuns: runs, bars: [{ id: "old-bar", label: "Energia", value: 75 }], checklist: [{ id: "old-list", label: "Destaque" }] }, { buttonDelaySeconds: 5 }), makeElement(c, "button", 1, { label: "Avançar", runs }, { delaySeconds: 5 })];
    const t = exportQuizTemplate({ name: "Round trip", settings: DEFAULT_QUIZ_SETTINGS }, sections);
    expect(t.sections[0].elements[0].content.options?.[0].next).toBe("s3");
    expect(JSON.stringify(t)).not.toContain("old-option"); expect(JSON.stringify(t)).not.toContain("old-bar");
    const copied = materializeQuizTemplate(parseQuizTemplate(JSON.stringify(t)), "new");
    const el = copied[0].elements[0], options = el.content.options as { id: string; next: string; runs: unknown }[];
    expect(options[0].next).toBe(copied[2].id); expect(options[0].id).not.toBe("old-option"); expect(options[0].runs).toEqual(runs);
    expect(resolveNextIndex(copied, 0, { [answerKey(copied[0].id, el.id)]: { type: "options", optionIds: [options[0].id] } })).toBe(2);
    expect(exportQuizTemplate({ name: "Round trip", settings: DEFAULT_QUIZ_SETTINGS }, copied)).toEqual(t);
    expect(copied[2].elements[0].settings.buttonDelaySeconds).toBe(5); expect(copied[2].elements[1].settings.delaySeconds).toBe(5);
  });
  it("does not enable result buttons or analysis on legacy imports", () => {
    const t = parseQuizTemplate({ ...base(), sections: [{ key: "s1", name: "Resultado", elements: [{ type: "result", content: {}, settings: {} }] }] });
    const result = materializeQuizTemplate(t, "q")[0].elements[0]; expect(result.settings.showButton).toBe(false); expect(result.settings.loading).toBe(false);
  });
  it("rejects invalid destinations", () => expect(() => parseQuizTemplate({ ...base(), sections: [{ key: "s1", name: "Pergunta", elements: [{ type: "options", content: { options: [{ label: "x", next: "missing" }] } }] }] })).toThrow("destino inválida"));
  it("rejects cycles", () => expect(() => parseQuizTemplate({ ...base(), sections: [{ key: "s1", name: "1", elements: [] }, { key: "s2", name: "2", elements: [{ type: "options", content: { options: [{ label: "x", next: "s1" }] } }] }] })).toThrow("ciclo"));
});