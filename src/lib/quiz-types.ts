// Tipos e padrões do módulo Modelar Quiz (Fase 1).
// Este arquivo é usado APENAS pelo módulo /modelar-quiz.

export type QuizStatus = "draft" | "published";

export type SectionType = "cover" | "content" | "question" | "result" | "capture";

export type ElementType =
  | "text"
  | "image"
  | "video"
  | "button"
  | "options"
  | "progress"
  | "percentage"
  | "fields";

export interface QuizSettings {
  font: string;
  background: {
    type: "color" | "gradient" | "image";
    color: string;
    gradientFrom: string;
    gradientTo: string;
    imageUrl: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    button: string;
    buttonText: string;
  };
  button: { radius: number; height: number; width: "auto" | "full" };
  layout: { contentWidth: number; spacing: number; align: "left" | "center" | "right" };
  progress: {
    enabled: boolean;
    showPercentage: boolean;
    thickness: number;
    radius: number;
    style: "solid" | "gradient";
  };
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  font: "Poppins",
  background: {
    type: "color",
    color: "#090B14",
    gradientFrom: "#090B14",
    gradientTo: "#141A2E",
    imageUrl: "",
  },
  colors: {
    primary: "#6D7CFF",
    secondary: "#1DB8FF",
    text: "#F5F7FF",
    button: "#6D7CFF",
    buttonText: "#FFFFFF",
  },
  button: { radius: 12, height: 48, width: "full" },
  layout: { contentWidth: 560, spacing: 16, align: "center" },
  progress: { enabled: true, showPercentage: true, thickness: 8, radius: 999, style: "gradient" },
};

export interface TextContent { text: string }
export interface ImageContent { url: string }
export interface VideoContent { url: string }
export interface ButtonContent { label: string }
export interface OptionItem { id: string; label: string }
export interface OptionsContent { options: OptionItem[] }
export interface FieldsContent { fields: { key: "name" | "email" | "whatsapp"; label: string; enabled: boolean }[] }

export interface QuizElement {
  id: string;
  section_id: string;
  type: ElementType;
  position: number;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface QuizSection {
  id: string;
  quiz_id: string;
  type: SectionType;
  title: string;
  position: number;
  settings: Record<string, unknown>;
  elements: QuizElement[];
}

export interface Quiz {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: QuizStatus;
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
}

export interface QuizListItem extends Quiz {
  sectionCount: number;
}

export const SECTION_LABEL: Record<SectionType, string> = {
  cover: "Capa",
  content: "Conteúdo",
  question: "Pergunta",
  result: "Resultado",
  capture: "Captura",
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------- fábricas de elementos ----------

export function makeElement(
  sectionId: string,
  type: ElementType,
  position: number,
  content: Record<string, unknown> = {},
  settings: Record<string, unknown> = {},
): QuizElement {
  const base: Record<ElementType, { content: Record<string, unknown>; settings: Record<string, unknown> }> = {
    text: {
      content: { text: "Escreva seu texto aqui" },
      settings: { size: 18, weight: 500, align: "center", color: "", spacing: 8 },
    },
    image: {
      content: { url: "" },
      settings: { width: 100, height: 0, radius: 16, align: "center" },
    },
    video: { content: { url: "" }, settings: { radius: 16 } },
    button: {
      content: { label: "Continuar" },
      settings: { size: 16, width: "full", align: "center", bg: "", color: "", radius: 12 },
    },
    options: {
      content: {
        options: [
          { id: uid(), label: "Opção 1" },
          { id: uid(), label: "Opção 2" },
          { id: uid(), label: "Opção 3" },
        ],
      },
      settings: {},
    },
    progress: { content: {}, settings: {} },
    percentage: {
      content: {},
      settings: { size: 14, weight: 600, color: "", align: "center" },
    },
    fields: {
      content: {
        fields: [
          { key: "name", label: "Nome", enabled: true },
          { key: "email", label: "E-mail", enabled: true },
          { key: "whatsapp", label: "WhatsApp", enabled: true },
        ],
      },
      settings: {},
    },
  };
  const d = base[type];
  return {
    id: uid(),
    section_id: sectionId,
    type,
    position,
    content: { ...d.content, ...content },
    settings: { ...d.settings, ...settings },
  };
}

export function makeSection(
  quizId: string,
  type: SectionType,
  position: number,
  title?: string,
): QuizSection {
  const id = uid();
  const section: QuizSection = {
    id,
    quiz_id: quizId,
    type,
    title: title ?? SECTION_LABEL[type],
    position,
    settings: {},
    elements: [],
  };

  const push = (t: ElementType, content?: Record<string, unknown>, settings?: Record<string, unknown>) =>
    section.elements.push(makeElement(id, t, section.elements.length, content, settings));

  switch (type) {
    case "cover":
      push("text", { text: "Descubra em 1 minuto" }, { size: 32, weight: 700 });
      push("text", { text: "Responda algumas perguntas rápidas e receba um resultado personalizado." }, { size: 16, weight: 400 });
      push("image");
      push("button", { label: "Começar agora" });
      break;
    case "content":
      push("text", { text: "Título do conteúdo" }, { size: 26, weight: 700 });
      push("text", { text: "Use este espaço para explicar, contextualizar ou criar conexão." }, { size: 16, weight: 400 });
      push("image");
      push("video");
      break;
    case "question":
      push("text", { text: "Qual é o seu maior objetivo hoje?" }, { size: 24, weight: 700 });
      push("options");
      push("button", { label: "Continuar" });
      break;
    case "result":
      push("text", { text: "Seu resultado está pronto!" }, { size: 28, weight: 700 });
      push("text", { text: "Com base nas suas respostas, preparamos a melhor recomendação para você." }, { size: 16, weight: 400 });
      push("image");
      push("button", { label: "Quero minha recomendação" });
      break;
    case "capture":
      push("text", { text: "Para onde enviamos seu resultado?" }, { size: 24, weight: 700 });
      push("fields");
      push("button", { label: "Ver meu resultado" });
      break;
  }
  return section;
}

// ---------- templates ----------

export interface QuizTemplate {
  key: string;
  name: string;
  description: string;
  sections: { type: SectionType; title?: string }[];
}

export const QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    key: "produto",
    name: "Quiz de Produto",
    description: "Capa, 3 perguntas e resultado — ideal para recomendar o produto certo.",
    sections: [
      { type: "cover" },
      { type: "question", title: "Pergunta 1" },
      { type: "question", title: "Pergunta 2" },
      { type: "question", title: "Pergunta 3" },
      { type: "result" },
    ],
  },
  {
    key: "emagrecimento",
    name: "Quiz de Emagrecimento",
    description: "Objetivo, rotina e hábitos para gerar um plano personalizado.",
    sections: [
      { type: "cover" },
      { type: "question", title: "Objetivo" },
      { type: "question", title: "Rotina" },
      { type: "question", title: "Hábitos" },
      { type: "result" },
    ],
  },
  {
    key: "diagnostico",
    name: "Quiz de Diagnóstico",
    description: "Perguntas + tela de diagnóstico antes do resultado final.",
    sections: [
      { type: "cover" },
      { type: "question", title: "Pergunta 1" },
      { type: "question", title: "Pergunta 2" },
      { type: "question", title: "Pergunta 3" },
      { type: "content", title: "Diagnóstico" },
      { type: "result" },
    ],
  },
  {
    key: "personalidade",
    name: "Quiz de Personalidade",
    description: "Formato clássico de perfil com resultado segmentado.",
    sections: [
      { type: "cover" },
      { type: "question", title: "Pergunta 1" },
      { type: "question", title: "Pergunta 2" },
      { type: "question", title: "Pergunta 3" },
      { type: "result" },
    ],
  },
];

export function buildSectionsFromTemplate(quizId: string, templateKey: string | null): QuizSection[] {
  if (!templateKey) {
    return [makeSection(quizId, "cover", 0)];
  }
  const tpl = QUIZ_TEMPLATES.find((t) => t.key === templateKey);
  if (!tpl) return [makeSection(quizId, "cover", 0)];
  return tpl.sections.map((s, i) => makeSection(quizId, s.type, i, s.title));
}
