// Fase 7 — cálculo de resultado do quiz (somente em memória, na sessão do visitante).
import { answerKey, type QuizAnswer } from "@/lib/quiz-session";
import type { OptionItem, QuizSection } from "@/lib/quiz-types";

export interface ResultRange {
  id: string;
  min: number | null;
  max: number | null;
  title: string;
  description: string;
  image?: string;
  /** Percentual opcional fixo para a faixa (0–100). */
  percent?: number | null;
}

export const DEFAULT_RESULT_TITLE = "Seu resultado";
export const DEFAULT_RESULT_DESCRIPTION = "Confira abaixo o resultado do seu quiz.";

function optionValue(o: OptionItem): number {
  const v = Math.trunc(Number(o.value));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Soma dos valores das respostas selecionadas. */
export function computeScore(sections: QuizSection[], answers: Record<string, QuizAnswer>): number {
  let total = 0;
  for (const s of sections) {
    for (const el of s.elements) {
      if (el.type !== "options") continue;
      const ans = answers[answerKey(s.id, el.id)];
      if (!ans || ans.type !== "options") continue;
      const opts = (el.content.options ?? []) as OptionItem[];
      for (const o of opts) if (ans.optionIds.includes(o.id)) total += optionValue(o);
    }
  }
  return total;
}

/** Maior pontuação possível: única = maior valor; múltipla = soma dos valores. */
export function computeMaxScore(sections: QuizSection[]): number {
  let max = 0;
  for (const s of sections) {
    for (const el of s.elements) {
      if (el.type !== "options") continue;
      const vals = ((el.content.options ?? []) as OptionItem[]).map(optionValue);
      if (!vals.length) continue;
      max += el.settings.selection === "multiple" ? vals.reduce((a, b) => a + b, 0) : Math.max(...vals);
    }
  }
  return max;
}

export function isValidRange(r: ResultRange): boolean {
  return r.min !== null && r.max !== null && Number.isFinite(r.min) && Number.isFinite(r.max) && r.min <= r.max;
}

export function rangeError(r: ResultRange): string | null {
  if (r.min === null || r.max === null) return null; // ainda em edição
  if (r.min > r.max) return "O valor mínimo não pode ser maior que o máximo.";
  return null;
}

export function matchRange(ranges: ResultRange[] | undefined, score: number): ResultRange | null {
  return (ranges ?? []).find((r) => isValidRange(r) && score >= r.min! && score <= r.max!) ?? null;
}

/** Percentual inteiro 0–100, ou null quando não há dados suficientes. */
export function computePercent(score: number, max: number): number | null {
  if (!(max > 0)) return null;
  return Math.min(100, Math.max(0, Math.round((score / max) * 100)));
}

export function fillPlaceholders(text: string, score: number, percent: number | null): string {
  return text
    .replace(/\{pontos\}/gi, String(score))
    .replace(/\{percentual\}/gi, percent === null ? "" : `${percent}%`);
}
