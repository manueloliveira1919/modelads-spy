import { readCta, ctaHref } from "./quiz-conversion";
import type { QuizElement, QuizSection } from "./quiz-types";
export const QUIZ_BUTTON_DELAYS = [0, 3, 5, 10, 20, 30] as const;
export function quizButtonDelay(value: unknown): number { const n = Number(value); return QUIZ_BUTTON_DELAYS.some(v => v === n) ? n : 0; }
export function quizButtonSettings(el: QuizElement): Record<string, unknown> {
  const s = el.settings;
  return el.type === "result" ? { ...s, cta: s.buttonAction ?? "none", ctaUrl: s.buttonUrl ?? "", ctaPhone: s.buttonPhone ?? "", ctaMessage: s.buttonMessage ?? "", ctaTarget: s.buttonTarget ?? "_blank", delaySeconds: s.buttonDelaySeconds ?? 0 } : s;
}
/** Same handler contract for independent and result buttons, without changing preview CTA behavior. */
export function executeQuizButton(settings: Record<string, unknown>, actions: { advance: () => void; preview: boolean; onPreview: (href: string) => void; open: (href: string, target: "_self" | "_blank") => void }): void {
  const href = ctaHref(readCta(settings));
  if (!href) { actions.advance(); return; }
  if (actions.preview) { actions.onPreview(href); return; }
  actions.open(href, settings.ctaTarget === "_self" ? "_self" : "_blank");
}
export function sectionAnalysisPending(section: QuizSection, ready: Set<string>): boolean {
  return section.elements.some(e => e.type === "result" && e.settings.loading === true && !ready.has(e.id));
}