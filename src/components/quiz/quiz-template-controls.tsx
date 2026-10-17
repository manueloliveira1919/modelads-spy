import { useState } from "react";
import { Copy, Download, FileJson, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { exportQuizTemplate, parseQuizTemplate, QUIZ_AI_INSTRUCTIONS, QUIZ_TEMPLATE_MAX_BYTES, QUIZ_TEMPLATE_FORMAT_ERROR, type QuizTemplate } from "@/lib/quiz-template";
import { QuizAiGuideDialog } from "./quiz-ai-guide";
import { useQuizCopy } from "./quiz-copy";
import { slugify, type Quiz, type QuizSection } from "@/lib/quiz-types";

export function QuizExportMenu({ getData }: { getData: () => Promise<{ quiz: Quiz; sections: QuizSection[] }> | { quiz: Quiz; sections: QuizSection[] } }) {
  const [busy, setBusy] = useState(false);
  const { copy, copyDialog } = useQuizCopy();
  const run = async (kind: "download" | "copy" | "instructions") => {
    setBusy(true);
    try {
      if (kind === "instructions") { await copy(QUIZ_AI_INSTRUCTIONS, "Instruções para IA copiadas."); return; }
      const { quiz, sections } = await getData();
      const json = JSON.stringify(exportQuizTemplate(quiz, sections), null, 2);
      if (kind === "copy") { await copy(json, "JSON copiado."); }
      else { const url = URL.createObjectURL(new Blob([json], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `${slugify(quiz.name) || "quiz"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível exportar."); }
    finally { setBusy(false); }
  };
  return <><DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={busy}><FileJson className="h-4 w-4" />Exportar template</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => void run("download")}><Download className="h-4 w-4" />Baixar arquivo .json</DropdownMenuItem><DropdownMenuItem onSelect={() => void run("copy")}><Copy className="h-4 w-4" />Copiar JSON</DropdownMenuItem><DropdownMenuItem onSelect={() => void run("instructions")}><Sparkles className="h-4 w-4" />Copiar instruções para IA</DropdownMenuItem></DropdownMenuContent></DropdownMenu>{copyDialog}</>;
}
export function QuizTemplateInput({ onParsed }: { onParsed: (template: QuizTemplate | null) => void }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [json, setJson] = useState("");
  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [error, setError] = useState("");
  const change = (value: string) => {
    setJson(value);
    try { const t = value.trim() ? parseQuizTemplate(value) : null; setTemplate(t); setError(""); onParsed(t); }
    catch (e) { setTemplate(null); onParsed(null); setError(e instanceof Error ? e.message : "Template inválido."); }
  };
  return <div className="space-y-3"><Textarea aria-label="JSON do template" rows={8} value={json} onChange={e => change(e.target.value)} placeholder='{"format":"modelads-quiz-template","version":1,...}' /><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border p-3 text-sm"><Upload className="h-4 w-4" />Escolher arquivo .json<input aria-label="Escolher arquivo JSON" className="sr-only" type="file" accept=".json,application/json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > QUIZ_TEMPLATE_MAX_BYTES) { setError("O template deve ter no máximo 1 MB."); setTemplate(null); onParsed(null); return; } change(await file.text()); e.target.value = ""; }} /></label>{error && <p role="alert" className="whitespace-pre-line text-sm text-destructive">{error}</p>}{error === QUIZ_TEMPLATE_FORMAT_ERROR && <Button variant="outline" onClick={() => setGuideOpen(true)}><Sparkles className="h-4 w-4" />Abrir guia</Button>}<QuizAiGuideDialog open={guideOpen} onOpenChange={setGuideOpen} onImport={() => setGuideOpen(false)} />{template && <p role="status" className="text-sm text-success">{template.name} · {template.sections.length} seções · {template.sections.reduce((sum, s) => sum + s.elements.length, 0)} elementos</p>}</div>;
}
export function QuizImportDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (v: boolean) => void; onImport: (t: QuizTemplate, replace: boolean) => void }) {
  const [template, setTemplate] = useState<QuizTemplate | null>(null);
  const [replace, setReplace] = useState(false);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Importar template</DialogTitle></DialogHeader><QuizTemplateInput onParsed={setTemplate} /><div className="flex flex-wrap gap-2"><Button variant={!replace ? "default" : "outline"} onClick={() => setReplace(false)}>Adicionar seções no final</Button><Button variant={replace ? "default" : "outline"} onClick={() => setReplace(true)}>Substituir o quiz inteiro</Button></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!template} onClick={() => { if (!template || replace && !window.confirm("Substituir todas as seções e a aparência deste quiz? Esta ação remove o conteúdo atual.")) return; onImport(template, replace); onOpenChange(false); }}>Importar</Button></DialogFooter></DialogContent></Dialog>;
}