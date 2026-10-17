import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { QUIZ_AI_ENABLED, generateQuizWithAI, quizAiInputSchema } from "./quiz-ai";
import { parseQuizTemplate, type QuizTemplate } from "./quiz-template";
export const generateQuizTemplateAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quizAiInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<QuizTemplate> => {
    const { data: plan, error } = await context.supabase.rpc("current_plan_code");
    if (error || !["admin", "pro", "premium"].includes(String(plan))) throw new Error("O gerador exige um plano Pro ou Premium.");
    const { assertAccountActive } = await import("./account-guard.server");
    await assertAccountActive(context.supabase, context.userId);
    if (!QUIZ_AI_ENABLED) throw new Error("IA ainda não conectada");
    // TODO: Connect the model in generateQuizWithAI; keep this validation boundary.
    return parseQuizTemplate(await generateQuizWithAI(data));
  });