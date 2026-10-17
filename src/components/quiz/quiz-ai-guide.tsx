import { useId, useRef, useState } from "react";
import { Copy, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildQuizAiPrompt, QUIZ_AI_INSTRUCTIONS } from "@/lib/quiz-template";
import { useQuizCopy } from "./quiz-copy";

export function QuizAiGuide({ onImport }: { onImport: () => void }) {
  const id = useId();
  const [request, setRequest] = useState("");
  const [goal, setGoal] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const instructions = useRef<HTMLTextAreaElement>(null);
  const { copy, copyDialog } = useQuizCopy();
  const prompt = () => buildQuizAiPrompt([request, goal && `Objetivo: ${goal}.`, count && `Número de perguntas: ${count}.`].filter(Boolean).join("\n"));
  return <div className="space-y-6">
    <section className="space-y-3">
      <h3 className="font-display text-base font-semibold">Passo 1 — Descreva seu quiz</h3>
      <Label htmlFor={id} className="sr-only">Descreva seu quiz</Label>
      <Textarea id={id} rows={4} value={request} onChange={event => setRequest(event.target.value)} placeholder="Ex.: Quiz para vender curso de maquiagem para iniciantes, 8 perguntas, captura nome e WhatsApp, resultado por faixa de pontos" />
      <div className="flex flex-wrap gap-2" aria-label="Objetivo do quiz">{["Captar leads", "Vender", "Diagnóstico"].map(value => <Button key={value} size="sm" variant={goal === value ? "secondary" : "outline"} aria-pressed={goal === value} onClick={() => setGoal(goal === value ? "" : value)}>{value}</Button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">Nº de perguntas</span>{[5, 7, 10].map(value => <Button key={value} size="sm" variant={count === value ? "secondary" : "outline"} aria-pressed={count === value} onClick={() => setCount(count === value ? null : value)}>{value}</Button>)}</div>
    </section>
    <section className="space-y-3 border-t border-border pt-5">
      <h3 className="font-display text-base font-semibold">Passo 2 — Copiar e colar na IA</h3>
      <Button className="h-auto min-h-11 w-full whitespace-normal" disabled={!request.trim()} onClick={() => void copy(prompt(), "Prompt pronto copiado.")}><Copy className="h-4 w-4 shrink-0" />Copiar prompt pronto</Button>
      <Button variant="outline" className="h-auto min-h-10 w-full whitespace-normal" onClick={() => void copy(QUIZ_AI_INSTRUCTIONS, "Instruções copiadas.")}>Copiar só as instruções</Button>
      <p className="text-sm text-muted-foreground">Cole no ChatGPT, Claude ou Gemini e peça um quiz por vez.</p>
      <details className="space-y-3"><summary className="cursor-pointer text-sm font-medium">Ver texto das instruções</summary><Textarea ref={instructions} readOnly aria-label="Instruções completas para IA" value={QUIZ_AI_INSTRUCTIONS} rows={9} /><Button size="sm" variant="outline" onClick={() => { instructions.current?.focus(); instructions.current?.select(); }}>Selecionar tudo</Button></details>
    </section>
    <section className="space-y-3 border-t border-border pt-5"><h3 className="font-display text-base font-semibold">Passo 3 — Importar o resultado</h3><p className="text-sm text-muted-foreground">Copie o JSON que a IA devolveu e importe aqui</p><Button variant="secondary" onClick={onImport}><FileJson className="h-4 w-4" />Importar template</Button></section>
    <details className="border-t border-border pt-5"><summary className="cursor-pointer text-sm font-medium">Erros comuns</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>O JSON precisa ter format, version, name e sections no nível de cima (nada de funnel/template).</li><li>Cores só #rrggbb (6 dígitos).</li><li>Links completos com https://, tel: ou mailto:.</li><li>O Modelads soma pontos (value nas opções) e usa faixas no resultado, não existe pontuação por perfil.</li><li>Peça um quiz por vez.</li></ol></details>
    {copyDialog}
  </div>;
}

export function QuizAiGuideDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (open: boolean) => void; onImport: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[100dvh] max-h-[100dvh] overflow-y-auto border-0 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:border"><DialogHeader><DialogTitle className="pr-6 leading-snug">Criar quiz com IA (ChatGPT/Claude/Gemini)</DialogTitle><DialogDescription>Seu pedido no formato do Modelads</DialogDescription></DialogHeader><QuizAiGuide onImport={onImport} /></DialogContent></Dialog>;
}