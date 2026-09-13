// Fase 3 — leitura pública de quizzes publicados e envio de leads.
import { supabase } from "@/integrations/supabase/client";
import { mergeSettings } from "@/lib/quiz-api";
import type { QuizSection, QuizSettings } from "@/lib/quiz-types";

export interface PublicQuiz {
  id: string;
  name: string;
  slug: string;
  settings: QuizSettings;
  sections: QuizSection[];
}

type AnyRow = Record<string, any>;

export async function loadPublicQuiz(slug: string): Promise<PublicQuiz | null> {
  const { data, error } = await (supabase as any).rpc("get_public_quiz", { p_slug: slug });
  if (error) throw error;
  if (!data) return null;
  const row = data as AnyRow;
  const sections: QuizSection[] = ((row.sections ?? []) as AnyRow[]).map((s) => ({
    id: s.id,
    quiz_id: row.id,
    type: s.type,
    title: s.title,
    position: s.position,
    settings: s.settings ?? {},
    elements: ((s.elements ?? []) as AnyRow[]).map((e) => ({
      id: e.id,
      section_id: s.id,
      type: e.type,
      position: e.position,
      content: e.content ?? {},
      settings: e.settings ?? {},
    })),
  }));
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    settings: mergeSettings(row.settings),
    sections,
  };
}

export async function submitQuizLead(input: {
  quizId: string;
  sessionId: string;
  name?: string;
  email?: string;
  whatsapp?: string;
}): Promise<void> {
  const { error } = await (supabase as any).rpc("submit_quiz_lead", {
    p_quiz_id: input.quizId,
    p_session_id: input.sessionId,
    p_name: input.name ?? null,
    p_email: input.email ?? null,
    p_whatsapp: input.whatsapp ?? null,
  });
  if (error) throw error;
}
