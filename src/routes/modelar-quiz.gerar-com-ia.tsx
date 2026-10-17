import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProGate } from "@/components/pro-gate";
import { useAuth } from "@/lib/auth-context";
import { QUIZ_AI_ENABLED, type QuizAiInput } from "@/lib/quiz-ai";
import { generateQuizTemplateAI } from "@/lib/quiz-ai.functions";
import { parseQuizTemplate } from "@/lib/quiz-template";
import { createQuizFromTemplate } from "@/lib/quiz-api";
import { QuizAiGuide } from "@/components/quiz/quiz-ai-guide";
import { slugify } from "@/lib/quiz-types";

export const Route = createFileRoute("/modelar-quiz/gerar-com-ia")({
  head: () => ({ meta: [{ title: "Gerar quiz com IA — Modelads" }, { name: "description", content: "Prepare seu próximo quiz de produto, leads ou diagnóstico no Modelads." }, { property: "og:title", content: "Gerar quiz com IA — Modelads" }, { property: "og:description", content: "Prepare seu próximo quiz de produto, leads ou diagnóstico no Modelads." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GenerateQuizPage,
});
function GenerateQuizPage() { return <ProGate icon={Sparkles} title="Gerar quiz com IA" description="Em breve"><GenerateQuizForm /></ProGate>; }
function GenerateQuizForm() {
  const { user } = useAuth(); const navigate = useNavigate(); const qc = useQueryClient(); const generate = useServerFn(generateQuizTemplateAI);
  const [input, setInput] = useState<QuizAiInput>({ description: "", audience: "", goal: "leads", questionCount: 5 }); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!QUIZ_AI_ENABLED || !user || busy) return;
    setBusy(true);
    try { const template = parseQuizTemplate(await generate({ data: input })); const id = await createQuizFromTemplate({ userId: user.id, name: template.name, slug: slugify(template.name), template }); await qc.invalidateQueries({ queryKey: ["quizzes"] }); await navigate({ to: "/modelar-quiz/$id", params: { id } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível gerar o quiz."); } finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-6 py-8"><Button asChild variant="ghost"><Link to="/modelar-quiz"><ArrowLeft className="h-4 w-4" />Meus quizzes</Link></Button><Sparkles className="h-10 w-10 text-brand" /><h1 className="font-display text-3xl font-bold">Gerar quiz com IA</h1><section className="space-y-5 border-y border-border py-6"><p className="text-sm text-muted-foreground">Enquanto a IA do Modelads não chega, use o guia</p><QuizAiGuide onImport={() => void navigate({ to: "/modelar-quiz", search: { import: true } })} /></section><div className="space-y-2"><Label htmlFor="quiz-ai-description">Descrição do produto/oferta</Label><Textarea id="quiz-ai-description" rows={7} value={input.description} onChange={e => setInput({ ...input, description: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="quiz-ai-audience">Público-alvo</Label><Input id="quiz-ai-audience" value={input.audience} onChange={e => setInput({ ...input, audience: e.target.value })} /></div><div className="space-y-2"><Label>Objetivo</Label><div className="flex flex-wrap gap-2">{([["leads", "Captar leads"], ["sales", "Vender"], ["diagnosis", "Diagnóstico/resultado"]] as const).map(([goal, text]) => <Button key={goal} aria-pressed={input.goal === goal} variant={input.goal === goal ? "default" : "outline"} onClick={() => setInput({ ...input, goal })}>{text}</Button>)}</div></div><div className="space-y-2"><Label>Nº de perguntas</Label><div className="flex gap-2">{([5, 7, 10] as const).map(questionCount => <Button key={questionCount} aria-pressed={input.questionCount === questionCount} variant={input.questionCount === questionCount ? "default" : "outline"} onClick={() => setInput({ ...input, questionCount })}>{questionCount}</Button>)}</div></div><Button aria-label="Gerar quiz" disabled={!QUIZ_AI_ENABLED || busy || !input.description.trim()} onClick={() => void submit()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{QUIZ_AI_ENABLED ? "Gerar quiz" : "Em breve"}</Button></div>;
}