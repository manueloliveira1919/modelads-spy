// Fase 6 — lógica condicional entre seções.
// Regra guardada em cada opção de resposta: `content.options[i].next = <sectionId>`.
// Sem `next` (quizzes antigos) = fluxo normal para a próxima seção.
// Módulo único usado por preview, teste completo e página pública.

import type { OptionItem, QuizSection } from "@/lib/quiz-types";
import { answerKey, type QuizAnswer } from "@/lib/quiz-session";

function optionsOf(section: QuizSection) {
  return section.elements
    .filter((e) => e.type === "options")
    .map((e) => ({ el: e, options: ((e.content.options ?? []) as OptionItem[]) }));
}

/** Destino válido: existe e não é a própria seção. */
function validTarget(sections: QuizSection[], from: QuizSection, target?: string): number {
  if (!target || target === from.id) return -1;
  return sections.findIndex((s) => s.id === target);
}

/**
 * Próxima seção a partir de `index`.
 * Determinístico: percorre os elementos de opções na ordem e, dentro de cada um,
 * as opções na ordem cadastrada; a PRIMEIRA opção selecionada com destino válido vence.
 * (Em múltipla escolha com destinos diferentes, vale a primeira na ordem das opções.)
 * Nenhum destino → index + 1.
 */
export function resolveNextIndex(
  sections: QuizSection[],
  index: number,
  answers: Record<string, QuizAnswer>,
): number {
  const section = sections[index];
  if (!section) return index + 1;
  for (const { el, options } of optionsOf(section)) {
    const ans = answers[answerKey(section.id, el.id)];
    if (!ans || ans.type !== "options") continue;
    for (const o of options) {
      if (!ans.optionIds.includes(o.id)) continue;
      const t = validTarget(sections, section, o.next);
      if (t >= 0) return t;
    }
  }
  return index + 1;
}

/** Grafo de navegação possível (padrão + condicional). */
function edges(sections: QuizSection[]): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>();
  sections.forEach((s, i) => {
    const out = new Set<string>();
    const groups = optionsOf(s);
    let needsDefault = groups.length === 0;
    for (const { el, options } of groups) {
      const multiple = (el.settings as Record<string, unknown>).selection === "multiple";
      const optional = (el.settings as Record<string, unknown>).required === false;
      if (multiple || optional || options.length === 0) needsDefault = true;
      for (const o of options) {
        const t = validTarget(sections, s, o.next);
        if (t >= 0) out.add(sections[t].id);
        else needsDefault = true;
      }
    }
    if (needsDefault && i + 1 < sections.length) out.add(sections[i + 1].id);
    g.set(s.id, out);
  });
  return g;
}

export function hasCycle(sections: QuizSection[]): boolean {
  const g = edges(sections);
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    state.set(id, 1);
    for (const n of g.get(id) ?? []) {
      const st = state.get(n);
      if (st === 1) return true;
      if (!st && visit(n)) return true;
    }
    state.set(id, 2);
    return false;
  };
  return sections.some((s) => !state.has(s.id) && visit(s.id));
}

/** Valida uma regra antes de aplicá-la. Retorna mensagem de erro ou null. */
export function validateRule(
  sections: QuizSection[],
  sectionId: string,
  elementId: string,
  optionId: string,
  target: string | null,
): string | null {
  if (!target) return null;
  if (target === sectionId) return "Uma resposta não pode direcionar para a mesma seção.";
  if (!sections.some((s) => s.id === target)) return "Essa seção não existe mais.";
  const simulated = setOptionTarget(sections, sectionId, elementId, optionId, target);
  if (hasCycle(simulated)) return "Essa conexão cria um ciclo no quiz. Escolha outra seção de destino.";
  return null;
}

export function setOptionTarget(
  sections: QuizSection[],
  sectionId: string,
  elementId: string,
  optionId: string,
  target: string | null,
): QuizSection[] {
  return sections.map((s) =>
    s.id !== sectionId
      ? s
      : {
          ...s,
          elements: s.elements.map((e) =>
            e.id !== elementId
              ? e
              : {
                  ...e,
                  content: {
                    ...e.content,
                    options: ((e.content.options ?? []) as OptionItem[]).map((o) =>
                      o.id === optionId ? withNext(o, target) : o,
                    ),
                  },
                },
          ),
        },
  );
}

function withNext(o: OptionItem, target: string | null): OptionItem {
  const { next: _drop, ...rest } = o;
  return target ? { ...rest, next: target } : rest;
}

/** Quantas regras apontam para a seção. */
export function countRulesTo(sections: QuizSection[], targetId: string): number {
  let n = 0;
  for (const s of sections)
    for (const { options } of optionsOf(s)) for (const o of options) if (o.next === targetId) n++;
  return n;
}

/** Remove regras que apontam para `targetId`. */
export function stripRulesTo(sections: QuizSection[], targetId: string): QuizSection[] {
  return sections.map((s) => {
    if (!optionsOf(s).some(({ options }) => options.some((o) => o.next === targetId))) return s;
    return {
      ...s,
      elements: s.elements.map((e) =>
        e.type !== "options"
          ? e
          : {
              ...e,
              content: {
                ...e.content,
                options: ((e.content.options ?? []) as OptionItem[]).map((o) =>
                  o.next === targetId ? withNext(o, null) : o,
                ),
              },
            },
      ),
    };
  });
}
