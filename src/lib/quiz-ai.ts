import { z } from "zod";
import type { QuizTemplate } from "./quiz-template";
export const QUIZ_AI_ENABLED = false;
export const quizAiInputSchema = z.object({ description: z.string().trim().min(1, "Descreva o produto/oferta.").max(20000), audience: z.string().trim().max(2000), goal: z.enum(["leads", "sales", "diagnosis"]), questionCount: z.union([z.literal(5), z.literal(7), z.literal(10)]) });
export type QuizAiInput = z.infer<typeof quizAiInputSchema>;
export async function generateQuizWithAI(input: QuizAiInput): Promise<QuizTemplate> {
  quizAiInputSchema.parse(input);
  // TODO: Insert the model call HERE, using QUIZ_AI_INSTRUCTIONS as its contract.
  // Return its JSON through parseQuizTemplate before leaving this function.
  throw new Error("IA ainda não conectada");
}