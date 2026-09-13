// Sessão de execução do quiz (Fase 2).
// Mantém respostas em memória durante a navegação do visitante.
// Nenhuma persistência no banco nesta fase — arquitetura pronta para leads/analytics.

import { uid } from "@/lib/quiz-types";

export interface OptionsAnswer {
  type: "options";
  optionIds: string[];
}

export interface FieldsAnswer {
  type: "fields";
  values: Record<string, string>;
}

export type QuizAnswer = OptionsAnswer | FieldsAnswer;

export interface QuizSessionState {
  quiz_id: string;
  session_id: string;
  /** chave: `${sectionId}:${elementId}` */
  answers: Record<string, QuizAnswer>;
  current_section: number;
  started_at: string;
}

export function answerKey(sectionId: string, elementId: string): string {
  return `${sectionId}:${elementId}`;
}

export function newSession(quizId: string): QuizSessionState {
  return {
    quiz_id: quizId,
    session_id: uid(),
    answers: {},
    current_section: 0,
    started_at: new Date().toISOString(),
  };
}
