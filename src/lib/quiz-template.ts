/** Portable contract: {format:"modelads-quiz-template",version:1,name,description?,
 * settings:{...appearance},sections:[{key:"s1",name,type?,settings?,elements:
 * [{type,content,settings}],logic?}]}.
 * Conditional options use content.options[].next = section key, never database IDs.
 * Optional section logic is {targets:[{element:number,option:number,next:string}]} (zero-based).
 * No user, slug, session or lead data is transported. Unknown properties are stripped.
 */
import { z } from "zod";
import { DEFAULT_QUIZ_SETTINGS, makeElement, uid, type Quiz, type QuizSection, type QuizSettings } from "./quiz-types";
import { QUIZ_FONTS, QUIZ_ANIMATIONS } from "./quiz-visual";
import { hasCycle } from "./quiz-logic";

export const QUIZ_TEMPLATE_MAX_BYTES = 1024 * 1024;
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Cor inválida: use #rrggbb.");
const color = z.union([hex, z.literal("")]);
const font = z.enum(QUIZ_FONTS, { errorMap: () => ({ message: "Fonte não permitida." }) });
const link = z.string().refine(v => {
  if (!v) return true;
  try { return ["http:", "https:", "tel:", "mailto:"].includes(new URL(v.trim()).protocol); } catch { return false; }
}, "Link não permitido: use http, https, tel ou mailto.");
const n = z.number().finite();
const align = z.enum(["left", "center", "right"]);
const run = z.object({ t: z.string(), color: hex.optional(), font: font.optional(), b: z.boolean().optional(), i: z.boolean().optional(), u: z.boolean().optional() });
const runs = z.array(run).max(10000);
const visual = z.object({
  size: n.min(10).max(120).optional(), weight: n.min(300).max(800).optional(), align: align.optional(), color: color.optional(), spacing: n.min(0).max(200).optional(),
  fontFamily: z.union([font, z.literal("")]).optional(), fontStyle: z.enum(["normal", "italic"]).optional(), textDecoration: z.enum(["none", "underline"]).optional(),
  lineHeight: n.min(1).max(2.2).optional(), letterSpacing: n.min(0).max(12).optional(),
  animation: z.string().refine(v => QUIZ_ANIMATIONS.some(a => a.value === v), "Animação não permitida.").optional(),
  animationDuration: n.min(0.2).max(3).optional(), animationDelay: n.min(0).max(2).optional(),
});
const delay = z.union([z.literal(0), z.literal(3), z.literal(5), z.literal(10), z.literal(20), z.literal(30)]);
const action = z.enum(["none", "url", "whatsapp", "checkout", "sales"]);
const elementSettings = visual.extend({
  width: z.union([n.min(0).max(100), z.enum(["auto", "full"])]).optional(), height: n.min(0).max(2000).optional(), radius: n.min(0).max(999).optional(), bg: color.optional(),
  cta: action.optional(), ctaUrl: link.optional(), ctaPhone: z.string().optional(), ctaMessage: z.string().optional(), ctaTarget: z.enum(["_self", "_blank"]).optional(), delaySeconds: delay.optional(),
  selection: z.enum(["single", "multiple"]).optional(), required: z.boolean().optional(),
  showScore: z.boolean().optional(), showPercent: z.boolean().optional(), chart: z.enum(["none", "bar", "circle"]).optional(), confetti: z.boolean().optional(), scoreSuffix: z.string().optional(),
  loading: z.boolean().optional(), loadingSeconds: z.union([z.literal(3), z.literal(5), z.literal(8)]).optional(), showBars: z.boolean().optional(), showBadge: z.boolean().optional(), showChecklist: z.boolean().optional(),
  showButton: z.boolean().optional(), buttonAction: action.optional(), buttonUrl: link.optional(), buttonPhone: z.string().optional(), buttonMessage: z.string().optional(), buttonTarget: z.enum(["_self", "_blank"]).optional(), buttonDelaySeconds: delay.optional(),
  styles: z.object({ title: visual.optional(), subtitle: visual.optional(), description: visual.optional(), score: visual.optional(), percent: visual.optional() }).optional(),
});
const item = z.object({ label: z.string().default(""), value: n.min(0).max(100).optional(), followScore: z.boolean().optional() });
const content = z.object({
  text: z.string().optional(), label: z.string().optional(), runs: runs.optional(), url: link.optional(), description: z.string().optional(), descriptionRuns: runs.optional(),
  options: z.array(z.object({ label: z.string().default("Opção"), text: z.string().optional(), runs: runs.optional(), emoji: z.string().optional(), image: link.optional(), next: z.string().optional(), value: n.int().min(0).optional() })).max(200).optional(),
  fields: z.array(z.object({ key: z.enum(["name", "email", "whatsapp"]), label: z.string(), enabled: z.boolean(), required: z.boolean().optional() })).max(3).optional(),
  title: z.string().optional(), titleRuns: runs.optional(), subtitle: z.string().optional(), subtitleRuns: runs.optional(), image: link.optional(),
  ranges: z.array(z.object({ min: n.nullable(), max: n.nullable(), title: z.string(), description: z.string(), image: link.optional(), percent: n.min(0).max(100).nullable().optional() })).max(200).optional(),
  badge: z.string().optional(), bars: z.array(item).max(200).optional(), checklist: z.array(item).max(200).optional(), loadingTitle: z.string().optional(), loadingSteps: z.array(item).max(200).optional(),
  buttonText: z.string().optional(), buttonTextRuns: runs.optional(),
});
const types = ["text", "image", "video", "button", "options", "progress", "percentage", "fields", "result"] as const;
const appearance = z.object({
  font: font.optional(), background: z.object({ type: z.enum(["color", "gradient", "image"]).optional(), color: hex.optional(), gradientFrom: hex.optional(), gradientTo: hex.optional(), imageUrl: link.optional() }).optional(),
  colors: z.object({ primary: hex.optional(), secondary: hex.optional(), text: hex.optional(), button: hex.optional(), buttonText: hex.optional() }).optional(),
  button: z.object({ radius: n.min(0).max(999).optional(), height: n.min(0).max(200).optional(), width: z.enum(["auto", "full"]).optional() }).optional(),
  layout: z.object({ contentWidth: n.min(200).max(2000).optional(), spacing: n.min(0).max(200).optional(), align: align.optional() }).optional(),
  progress: z.object({ enabled: z.boolean().optional(), showPercentage: z.boolean().optional(), thickness: n.min(0).max(100).optional(), radius: n.min(0).max(999).optional(), style: z.enum(["solid", "gradient"]).optional() }).optional(),
});
const schema = z.object({
  format: z.literal("modelads-quiz-template"), version: z.literal(1), name: z.string().trim().min(1).max(200), description: z.string().max(10000).optional(), settings: appearance.default({}),
  sections: z.array(z.object({ key: z.string().min(1).max(100), name: z.string().default("Seção"), type: z.enum(["cover", "content", "question", "result", "capture"]).optional(), settings: z.object({}).default({}),
    elements: z.array(z.object({ type: z.enum(types), content: content.default({}), settings: elementSettings.default({}) })).max(60, "Máximo de 60 elementos por seção."),
    logic: z.object({ targets: z.array(z.object({ element: n.int().min(0), option: n.int().min(0), next: z.string() })).max(12000) }).optional(),
  })).min(1, "Inclua pelo menos uma seção.").max(40, "Máximo de 40 seções."),
});
export type QuizTemplate = z.infer<typeof schema>;

function context(path: (string | number)[]) {
  const s = path.indexOf("sections"), e = path.indexOf("elements");
  return `${s >= 0 ? `Seção ${Number(path[s + 1]) + 1}` : "Template"}${e >= 0 ? `, elemento ${Number(path[e + 1]) + 1}` : ""}`;
}
/** Reject suspicious URL properties even if they are unknown and would otherwise be stripped. */
function checkLinks(value: unknown, path: (string | number)[] = []): void {
  if (Array.isArray(value)) { value.forEach((v, i) => checkLinks(v, [...path, i])); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string" && (/href|url|src|image$/i.test(key)) && v && !link.safeParse(v).success) throw new Error(`${context(path)}: link não permitido (${key}). Use http, https, tel ou mailto.`);
    checkLinks(v, [...path, key]);
  }
}
export function parseQuizTemplate(input: string | unknown): QuizTemplate {
  let raw: unknown;
  try {
    const json = typeof input === "string" ? input : JSON.stringify(input);
    if (new TextEncoder().encode(json).byteLength > QUIZ_TEMPLATE_MAX_BYTES) throw new Error("O template deve ter no máximo 1 MB.");
    raw = JSON.parse(json);
  } catch (e) { if (e instanceof Error && e.message.includes("1 MB")) throw e; throw new Error("JSON inválido. Confira vírgulas, aspas e chaves."); }
  checkLinks(raw);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path[issue.path.length - 1];
    if (field === "version") throw new Error("Versão de template desconhecida. Use version: 1.");
    if (field === "format") throw new Error('Formato inválido. Use "modelads-quiz-template".');
    if (field === "type") { const val = issue.path.reduce<unknown>((v, k) => v && typeof v === "object" ? (v as Record<string | number, unknown>)[k] : undefined, raw); throw new Error(`${context(issue.path)}: tipo '${String(val)}' não existe.`); }
    throw new Error(`${context(issue.path)}: ${issue.message.startsWith("Expected") ? "Campo inválido ou obrigatório ausente." : issue.message}`);
  }
  const template = parsed.data;
  const keys = new Set(template.sections.map(s => s.key));
  if (keys.size !== template.sections.length) throw new Error("As keys das seções devem ser únicas.");
  template.sections.forEach((s, si) => {
    for (const t of s.logic?.targets ?? []) {
      const el = s.elements[t.element]; const option = el?.content.options?.[t.option];
      if (el?.type !== "options" || !option) throw new Error(`Seção ${si + 1}: regra aponta para uma opção inexistente.`);
      option.next = t.next;
    }
    s.elements.forEach((e, ei) => e.content.options?.forEach(o => {
      if (o.next && (!keys.has(o.next) || o.next === s.key)) throw new Error(`Seção ${si + 1}, elemento ${ei + 1}: seção de destino inválida '${o.next}'.`);
    }));
  });
  if (hasCycle(materializeQuizTemplate(template, "validation"))) throw new Error("A lógica do template cria um ciclo entre seções.");
  return template;
}
export function templateSettings(template: QuizTemplate): QuizSettings {
  const s = template.settings, d = DEFAULT_QUIZ_SETTINGS;
  return { font: s.font ?? d.font, background: { ...d.background, ...s.background }, colors: { ...d.colors, ...s.colors }, button: { ...d.button, ...s.button }, layout: { ...d.layout, ...s.layout }, progress: { ...d.progress, ...s.progress } };
}
export function materializeQuizTemplate(template: QuizTemplate, quizId: string, offset = 0): QuizSection[] {
  const ids = new Map(template.sections.map(s => [s.key, uid()]));
  return template.sections.map((s, i) => {
    const id = ids.get(s.key) ?? uid();
    return { id, quiz_id: quizId, title: s.name, type: s.type ?? (s.elements.some(e => e.type === "options") ? "question" : s.elements.some(e => e.type === "result") ? "result" : s.elements.some(e => e.type === "fields") ? "capture" : "content"), position: offset + i, settings: s.settings,
      elements: s.elements.map((e, j) => {
        const ct = structuredClone(e.content) as Record<string, unknown>;
        for (const key of ["options", "ranges", "bars", "checklist", "loadingSteps"]) if (Array.isArray(ct[key])) ct[key] = ct[key].map((o: Record<string, unknown>) => ({ ...o, id: uid(), ...(key === "options" && o.next ? { next: ids.get(String(o.next)) } : {}) }));
        // Missing fields on imported legacy results must not opt into new result behavior.
        return makeElement(id, e.type, j, ct, { ...(e.type === "result" ? { showButton: false, loading: false } : {}), ...e.settings });
      }),
    };
  });
}
export function exportQuizTemplate(quiz: Pick<Quiz, "name" | "settings">, sections: QuizSection[]): QuizTemplate {
  const keys = new Map(sections.map((s, i) => [s.id, `s${i + 1}`]));
  const portable = sections.map(s => ({ key: keys.get(s.id), name: s.title, type: s.type, settings: s.settings, elements: s.elements.map(e => {
    const ct = structuredClone(e.content);
    for (const key of ["options", "ranges", "bars", "checklist", "loadingSteps"]) if (Array.isArray(ct[key])) ct[key] = ct[key].map((o: Record<string, unknown>) => { const { id: _id, next, ...rest } = o; return { ...rest, ...(key === "options" && next && keys.has(String(next)) ? { next: keys.get(String(next)) } : {}) }; });
    return { type: e.type, content: ct, settings: { ...(e.type === "result" ? { showButton: false, loading: false } : {}), ...e.settings } };
  }) }));
  return parseQuizTemplate({ format: "modelads-quiz-template", version: 1, name: quiz.name, settings: quiz.settings, sections: portable });
}
export const QUIZ_AI_INSTRUCTIONS = `Crie somente JSON válido, sem markdown, no contrato Modelads Quiz:
{"format":"modelads-quiz-template","version":1,"name":"Nome do quiz","description":"Opcional","settings":{},"sections":[{"key":"s1","name":"Capa","type":"cover","elements":[{"type":"text","content":{"text":"Seu título","runs":[{"t":"Seu título","b":true}]},"settings":{"size":32}},{"type":"button","content":{"label":"Começar"},"settings":{"cta":"none","delaySeconds":0}}]}]}
Não inclua ids, user, slug ou leads. Máximo 1 MB, 40 seções e 60 elementos por seção.
Tipos de seção: cover, content, question, result, capture. Tipos de elemento: ${types.join(", ")}.
Texto: content.text e runs. Botão: content.label/runs; settings.cta=none|url|whatsapp|checkout, ctaUrl, ctaPhone, ctaMessage, ctaTarget=_self|_blank, delaySeconds=0|3|5|10|20|30.
Imagem/vídeo: content.url. Opções: content.description/descriptionRuns, options:[{label,text?,runs?,emoji?,image?,value?:inteiro>=0,next?:key da seção}]; settings.selection=single|multiple, required. Campos: content.fields:[{key:name|email|whatsapp,label,enabled,required}]. Progresso e percentage não exigem conteúdo.
Resultado: content.title/titleRuns, subtitle/subtitleRuns, description/descriptionRuns,image,ranges:[{min,max,title,description,image?,percent?}],badge,bars:[{label,value:0..100,followScore}],checklist:[{label}],loadingTitle,loadingSteps:[{label}],buttonText/buttonTextRuns. Settings: showScore,showPercent,chart=none|bar|circle,confetti,scoreSuffix,loading,loadingSeconds=3|5|8,showBars,showBadge,showChecklist,showButton,buttonAction=none|url|whatsapp|checkout,buttonUrl,buttonPhone,buttonMessage,buttonTarget,buttonDelaySeconds=0|3|5|10|20|30,styles:{title,subtitle,description,score,percent}.
Tipografia settings: fontFamily,size:10..120,weight:300..800,align=left|center|right,color,spacing,fontStyle=normal|italic,textDecoration=none|underline,lineHeight:1..2.2,letterSpacing:0..12,animation=none|fade-in|fade-up|fade-down|fade-left|fade-right|zoom-in|zoom-out|bounce|pulse,animationDuration:0.2..3,animationDelay:0..2. Botão/imagem: width,radius,height,bg.
Runs: [{t:string,color?,font?,b?,i?,u?}], mantendo texto simples sincronizado. Cores SOMENTE #rrggbb. Fontes SOMENTE ${QUIZ_FONTS.join(", ")}. Links SOMENTE http/https/tel/mailto, nunca javascript, HTML ou scripts.
Settings globais: font; background:{type:color|gradient|image,color,gradientFrom,gradientTo,imageUrl}; colors:{primary,secondary,text,button,buttonText}; button:{radius,height,width:auto|full}; layout:{contentWidth,spacing,align}; progress:{enabled,showPercentage,thickness,radius,style:solid|gradient}.
Cada seção tem key única. Destinos next referenciam keys, não ids. Não crie ciclos. Todos os campos visuais opcionais usam os padrões do editor.`;