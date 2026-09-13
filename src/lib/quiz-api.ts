// Acesso a dados do módulo Modelar Quiz. Usa o client do navegador (RLS ativa:
// cada usuário só enxerga os próprios quizzes).
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_QUIZ_SETTINGS,
  buildSectionsFromTemplate,
  slugify,
  uid,
  type Quiz,
  type QuizListItem,
  type QuizSection,
  type QuizSettings,
  type QuizStatus,
} from "./quiz-types";

const QUIZZES = "quizzes";
const SECTIONS = "quiz_sections";
const ELEMENTS = "quiz_elements";

type AnyRow = Record<string, any>;

function db(table: string) {
  return (supabase as any).from(table);
}

function normalizeQuiz(row: AnyRow): Quiz {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    status: row.status as QuizStatus,
    settings: mergeSettings(row.settings),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mergeSettings(raw: unknown): QuizSettings {
  const s = (raw ?? {}) as Partial<QuizSettings>;
  const d = DEFAULT_QUIZ_SETTINGS;
  return {
    font: s.font ?? d.font,
    background: { ...d.background, ...(s.background ?? {}) },
    colors: { ...d.colors, ...(s.colors ?? {}) },
    button: { ...d.button, ...(s.button ?? {}) },
    layout: { ...d.layout, ...(s.layout ?? {}) },
    progress: { ...d.progress, ...(s.progress ?? {}) },
  };
}

export async function listQuizzes(): Promise<QuizListItem[]> {
  const { data, error } = await db(QUIZZES)
    .select("*, quiz_sections(count)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: AnyRow) => ({
    ...normalizeQuiz(row),
    sectionCount: row.quiz_sections?.[0]?.count ?? 0,
  }));
}

/** Disponibilidade do endereço público — global (todos os usuários). */
export async function isSlugAvailable(slug: string, excludeId?: string | null): Promise<boolean> {
  const clean = slugify(slug);
  if (!clean) return false;
  const { data, error } = await (supabase as any).rpc("quiz_slug_available", {
    p_slug: clean,
    p_exclude_id: excludeId ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Sugere um endereço livre a partir de uma base (base, base-2, base-3...). */
export async function suggestSlug(base: string, excludeId?: string | null): Promise<string> {
  const clean = slugify(base) || "quiz";
  const { data, error } = await (supabase as any).rpc("quiz_suggest_slug", {
    p_slug: clean,
    p_exclude_id: excludeId ?? null,
  });
  if (error) throw error;
  return (data as string) || clean;
}

export class SlugTakenError extends Error {
  constructor() {
    super("Este endereço já está sendo utilizado.");
    this.name = "SlugTakenError";
  }
}

function isUniqueViolation(error: AnyRow | null): boolean {
  return Boolean(error && (error.code === "23505" || /duplicate key|quizzes_slug_unique/i.test(String(error.message ?? ""))));
}

async function uniqueSlug(_userId: string, base: string): Promise<string> {
  return suggestSlug(base);
}

export async function createQuiz(input: {
  userId: string;
  name: string;
  slug: string;
  templateKey: string | null;
}): Promise<string> {
  const desired = slugify(input.slug || input.name);
  // Unicidade global: usa o endereço pedido se estiver livre, senão a primeira alternativa.
  const slug = desired && (await isSlugAvailable(desired)) ? desired : await uniqueSlug(input.userId, desired || input.name);
  const quizId = uid();

  const { error } = await db(QUIZZES).insert({
    id: quizId,
    user_id: input.userId,
    name: input.name.trim() || "Novo Quiz",
    slug,
    status: "draft",
    settings: DEFAULT_QUIZ_SETTINGS,
  });
  if (isUniqueViolation(error)) throw new SlugTakenError();
  if (error) throw error;

  const sections = buildSectionsFromTemplate(quizId, input.templateKey);
  await insertSections(sections);
  return quizId;
}

async function insertSections(sections: QuizSection[]) {
  if (sections.length === 0) return;
  const { error: sErr } = await db(SECTIONS).insert(
    sections.map((s) => ({
      id: s.id,
      quiz_id: s.quiz_id,
      type: s.type,
      title: s.title,
      position: s.position,
      settings: s.settings,
    })),
  );
  if (sErr) throw sErr;

  const elements = sections.flatMap((s) => s.elements);
  if (elements.length === 0) return;
  const { error: eErr } = await db(ELEMENTS).insert(
    elements.map((e) => ({
      id: e.id,
      section_id: e.section_id,
      type: e.type,
      position: e.position,
      content: e.content,
      settings: e.settings,
    })),
  );
  if (eErr) throw eErr;
}

export async function loadQuiz(quizId: string): Promise<{ quiz: Quiz; sections: QuizSection[] }> {
  const { data: quizRow, error } = await db(QUIZZES).select("*").eq("id", quizId).maybeSingle();
  if (error) throw error;
  if (!quizRow) throw new Error("Quiz não encontrado");

  const { data: sectionRows, error: sErr } = await db(SECTIONS)
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });
  if (sErr) throw sErr;

  const ids = (sectionRows ?? []).map((s: AnyRow) => s.id);
  let elementRows: AnyRow[] = [];
  if (ids.length > 0) {
    const { data: els, error: eErr } = await db(ELEMENTS)
      .select("*")
      .in("section_id", ids)
      .order("position", { ascending: true });
    if (eErr) throw eErr;
    elementRows = els ?? [];
  }

  const sections: QuizSection[] = (sectionRows ?? []).map((s: AnyRow) => ({
    id: s.id,
    quiz_id: s.quiz_id,
    type: s.type,
    title: s.title,
    position: s.position,
    settings: s.settings ?? {},
    elements: elementRows
      .filter((e) => e.section_id === s.id)
      .map((e) => ({
        id: e.id,
        section_id: e.section_id,
        type: e.type,
        position: e.position,
        content: e.content ?? {},
        settings: e.settings ?? {},
      })),
  }));

  return { quiz: normalizeQuiz(quizRow), sections };
}

export async function saveQuiz(quiz: Quiz, sections: QuizSection[]): Promise<void> {
  const slug = slugify(quiz.slug);
  if (!slug) throw new SlugTakenError();
  if (!(await isSlugAvailable(slug, quiz.id))) throw new SlugTakenError();

  const { error } = await db(QUIZZES)
    .update({
      name: quiz.name,
      slug,
      status: quiz.status,
      settings: quiz.settings,
    })
    .eq("id", quiz.id);
  if (isUniqueViolation(error)) throw new SlugTakenError();
  if (error) throw error;

  // Seções: upsert das atuais + remoção das que saíram.
  const { data: existingSections, error: exErr } = await db(SECTIONS)
    .select("id")
    .eq("quiz_id", quiz.id);
  if (exErr) throw exErr;

  const keepSections = new Set(sections.map((s) => s.id));
  const removeSections = (existingSections ?? [])
    .map((r: AnyRow) => r.id)
    .filter((id: string) => !keepSections.has(id));
  if (removeSections.length > 0) {
    const { error: delErr } = await db(SECTIONS).delete().in("id", removeSections);
    if (delErr) throw delErr;
  }

  if (sections.length > 0) {
    const { error: upErr } = await db(SECTIONS).upsert(
      sections.map((s, i) => ({
        id: s.id,
        quiz_id: quiz.id,
        type: s.type,
        title: s.title,
        position: i,
        settings: s.settings,
      })),
      { onConflict: "id" },
    );
    if (upErr) throw upErr;
  }

  const elements = sections.flatMap((s, si) =>
    s.elements.map((e, ei) => ({
      id: e.id,
      section_id: s.id,
      type: e.type,
      position: ei,
      content: e.content,
      settings: e.settings,
      _s: si,
    })),
  );

  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length > 0) {
    const { data: existingEls, error: eexErr } = await db(ELEMENTS)
      .select("id")
      .in("section_id", sectionIds);
    if (eexErr) throw eexErr;
    const keepEls = new Set(elements.map((e) => e.id));
    const removeEls = (existingEls ?? [])
      .map((r: AnyRow) => r.id)
      .filter((id: string) => !keepEls.has(id));
    if (removeEls.length > 0) {
      const { error: delErr } = await db(ELEMENTS).delete().in("id", removeEls);
      if (delErr) throw delErr;
    }
  }

  if (elements.length > 0) {
    const { error: upErr } = await db(ELEMENTS).upsert(
      elements.map(({ _s, ...e }) => e),
      { onConflict: "id" },
    );
    if (upErr) throw upErr;
  }
}

export async function duplicateQuiz(quizId: string, userId: string): Promise<string> {
  const { quiz, sections } = await loadQuiz(quizId);
  const slug = await uniqueSlug(userId, `${quiz.slug}-copia`);
  const newId = uid();

  const { error } = await db(QUIZZES).insert({
    id: newId,
    user_id: userId,
    name: `${quiz.name} (cópia)`,
    slug,
    status: "draft",
    settings: quiz.settings,
  });
  if (error) throw error;

  const cloned: QuizSection[] = sections.map((s, i) => {
    const sid = uid();
    return {
      ...s,
      id: sid,
      quiz_id: newId,
      position: i,
      elements: s.elements.map((e, ei) => ({ ...e, id: uid(), section_id: sid, position: ei })),
    };
  });
  await insertSections(cloned);
  return newId;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await db(QUIZZES).delete().eq("id", quizId);
  if (error) throw error;
}
