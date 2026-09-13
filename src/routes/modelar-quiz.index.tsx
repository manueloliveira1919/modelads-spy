import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, HelpCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProGate } from "@/components/pro-gate";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { createQuiz, deleteQuiz, duplicateQuiz, listQuizzes } from "@/lib/quiz-api";
import { QUIZ_TEMPLATES, slugify, type QuizListItem } from "@/lib/quiz-types";

export const Route = createFileRoute("/modelar-quiz/")({
  head: () => ({
    meta: [
      { title: "Modelar Quiz — Modelads" },
      {
        name: "description",
        content:
          "Crie quizzes interativos para transformar visitantes em leads e vendas, com editor visual e templates prontos.",
      },
      { property: "og:title", content: "Modelar Quiz — Modelads" },
      {
        property: "og:description",
        content: "Crie quizzes interativos para transformar visitantes em leads e vendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizListPage,
});

function QuizListPage() {
  return (
    <ProGate
      icon={HelpCircle}
      title="Modelar Quiz"
      description="Crie quizzes interativos para transformar visitantes em leads e vendas."
    >
      <QuizListContent />
    </ProGate>
  );
}

function QuizListContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<QuizListItem | null>(null);

  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ["quizzes", user?.id],
    queryFn: listQuizzes,
    enabled: !!user,
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateQuiz(id, user!.id),
    onSuccess: () => {
      toast.success("Quiz duplicado como rascunho.");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: () => toast.error("Não foi possível duplicar o quiz."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteQuiz(id),
    onSuccess: () => {
      toast.success("Quiz excluído.");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: () => toast.error("Não foi possível excluir o quiz."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-brand text-white">
          <Plus className="mr-1.5 h-4 w-4" /> Criar novo Quiz
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Não foi possível carregar seus quizzes. Recarregue a página.
        </div>
      )}

      {!isLoading && !error && (quizzes?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Crie seu primeiro quiz</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Comece do zero ou use um template pronto para captar leads e vender mais.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-5 bg-gradient-brand text-white">
            <Plus className="mr-1.5 h-4 w-4" /> Criar novo Quiz
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(quizzes ?? []).map((q) => (
          <article
            key={q.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand/50"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base font-bold leading-snug">{q.name}</h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  q.status === "published"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {q.status === "published" ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">/{q.slug}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {q.sectionCount} {q.sectionCount === 1 ? "seção" : "seções"} ·{" "}
              {new Date(q.created_at).toLocaleDateString("pt-BR")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/modelar-quiz/$id" params={{ id: q.id }}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/modelar-quiz/$id" params={{ id: q.id }} search={{ preview: 1 }}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Visualizar
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={duplicateMut.isPending}
                onClick={() => duplicateMut.mutate(q.id)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDelete(q)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>

      <NewQuizDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["quizzes"] });
          navigate({ to: "/modelar-quiz/$id", params: { id } });
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              O quiz “{pendingDelete?.name}” e todas as suas seções e elementos serão removidos
              definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteMut.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NewQuizDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [mode, setMode] = useState<"blank" | "template">("blank");
  const [templateKey, setTemplateKey] = useState(QUIZ_TEMPLATES[0].key);

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setMode("blank");
      setTemplateKey(QUIZ_TEMPLATES[0].key);
    }
  }, [open]);

  const autoSlug = useMemo(() => slugify(name), [name]);
  const effectiveSlug = slugTouched ? slug : autoSlug;

  const mut = useMutation({
    mutationFn: () =>
      createQuiz({
        userId: user!.id,
        name,
        slug: effectiveSlug,
        templateKey: mode === "template" ? templateKey : null,
      }),
    onSuccess: (id) => {
      onOpenChange(false);
      onCreated(id);
      toast.success("Quiz criado.");
    },
    onError: () => toast.error("Não foi possível criar o quiz."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Quiz</DialogTitle>
          <DialogDescription>Dê um nome e escolha como quer começar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do quiz</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Quiz de Emagrecimento"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço (slug)</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="quiz-de-emagrecimento"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["blank", "template"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm font-semibold transition-colors",
                  mode === m ? "border-brand bg-brand/10" : "border-border hover:border-brand/40",
                )}
              >
                {m === "blank" ? "Começar do zero" : "Usar template"}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {m === "blank" ? "Somente uma capa" : "Estrutura pronta e editável"}
                </span>
              </button>
            ))}
          </div>

          {mode === "template" && (
            <div className="space-y-2">
              {QUIZ_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    templateKey === t.key
                      ? "border-brand bg-brand/10"
                      : "border-border hover:border-brand/40",
                  )}
                >
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t.sections.length} seções
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || mut.isPending}
            onClick={() => mut.mutate()}
            className="bg-gradient-brand text-white"
          >
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Criar quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
