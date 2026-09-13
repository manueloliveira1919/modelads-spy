import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  Monitor,
  Plus,
  Rocket,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2,
  TriangleAlert,
  Type as TypeIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ProGate } from "@/components/pro-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { QuizPreview, type PreviewDevice } from "@/components/quiz/quiz-preview";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { AppearancePanel, SectionProperties } from "@/components/quiz/quiz-panels";
import { loadQuiz, saveQuiz } from "@/lib/quiz-api";
import {
  SECTION_LABEL,
  makeSection,
  uid,
  type Quiz,
  type QuizSection,
  type QuizSettings,
  type SectionType,
} from "@/lib/quiz-types";

export const Route = createFileRoute("/modelar-quiz/$id")({
  validateSearch: (search: Record<string, unknown>): { preview?: 1 } =>
    search.preview ? { preview: 1 } : {},
  head: () => ({
    meta: [
      { title: "Editor de Quiz — Modelads" },
      {
        name: "description",
        content: "Editor visual de quizzes: seções, elementos, aparência e preview responsivo.",
      },
      { property: "og:title", content: "Editor de Quiz — Modelads" },
      {
        property: "og:description",
        content: "Monte seu quiz com seções, elementos e preview em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditorPage,
});

const SECTION_ICON: Record<SectionType, typeof Layers> = {
  cover: ImageIcon,
  content: TypeIcon,
  question: HelpCircle,
  result: Rocket,
  capture: Layers,
};

type SaveState = "idle" | "saving" | "saved" | "error";

function EditorPage() {
  return (
    <ProGate icon={HelpCircle} title="Modelar Quiz" description="Editor visual do seu quiz.">
      <EditorContent />
    </ProGate>
  );
}

function EditorContent() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sections, setSections] = useState<QuizSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"secoes" | "preview" | "propriedades">("preview");
  const [previewMode, setPreviewMode] = useState(search.preview === 1);
  const [runKey, setRunKey] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadQuiz(id)
      .then(({ quiz: q, sections: s }) => {
        if (!alive) return;
        setQuiz(q);
        setSections(s);
        setSelectedId(s[0]?.id ?? null);
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const persist = useCallback(async (q: Quiz, s: QuizSection[]) => {
    setSaveState("saving");
    try {
      await saveQuiz(q, s);
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  // autosave com debounce
  useEffect(() => {
    if (!quiz || !dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(quiz, sections), 1200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [quiz, sections, persist]);

  const touch = () => {
    dirtyRef.current = true;
    setSaveState("idle");
  };

  const updateQuiz = (patch: Partial<Quiz>) => {
    touch();
    setQuiz((q) => (q ? { ...q, ...patch } : q));
  };
  const updateSettings = (patch: Partial<QuizSettings>) => {
    touch();
    setQuiz((q) => (q ? { ...q, settings: { ...q.settings, ...patch } } : q));
  };
  const updateSection = (sid: string, patch: Partial<QuizSection>) => {
    touch();
    setSections((prev) => prev.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  };

  const addSection = (type: SectionType) => {
    if (!quiz) return;
    touch();
    const s = makeSection(quiz.id, type, sections.length);
    setSections((prev) => [...prev, s]);
    setSelectedId(s.id);
  };

  const duplicateSection = (sid: string) => {
    touch();
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      if (idx < 0) return prev;
      const src = prev[idx];
      const newId = uid();
      const copy: QuizSection = {
        ...src,
        id: newId,
        title: `${src.title} (cópia)`,
        elements: src.elements.map((e) => ({ ...e, id: uid(), section_id: newId })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next.map((s, i) => ({ ...s, position: i }));
    });
  };

  const removeSection = (sid: string) => {
    touch();
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sid).map((s, i) => ({ ...s, position: i }));
      if (selectedId === sid) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    touch();
    setSections((prev) => {
      const from = prev.findIndex((s) => s.id === fromId);
      const to = prev.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, position: i }));
    });
  };

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? null,
    [sections, selectedId],
  );
  const selectedIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === selectedId),
  );

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
        <TriangleAlert className="mx-auto h-6 w-6 text-destructive" />
        <p className="mt-3 text-sm">Não foi possível abrir este quiz.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/modelar-quiz">Voltar para Quizzes</Link>
        </Button>
      </div>
    );
  }

  if (!quiz) {
    return <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/50" />;
  }

  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(false)}>
            <X className="mr-1.5 h-4 w-4" /> Fechar visualização
          </Button>
          <DeviceSwitch device={device} onChange={setDevice} />
        </div>
        <QuizRunner
          key={runKey}
          quizId={quiz.id}
          sections={sections}
          settings={quiz.settings}
          device={device}
        />
        <div className="flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={() => setRunKey((k) => k + 1)}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reiniciar quiz
          </Button>
        </div>
      </div>
    );
  }

  const sectionsPanel = (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Seções
      </div>
      {sections.map((s, i) => {
        const Icon = SECTION_ICON[s.type];
        return (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) reorder(dragId, s.id);
              setDragId(null);
            }}
            onDragEnd={() => setDragId(null)}
            onClick={() => {
              setSelectedId(s.id);
              setMobilePanel("propriedades");
            }}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition-colors",
              selectedId === s.id
                ? "border-brand bg-brand/10"
                : "border-border hover:border-brand/40",
              dragId === s.id && "opacity-50",
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
            <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
            <Icon className="h-4 w-4 shrink-0 text-brand" />
            <span className="flex-1 truncate font-medium">{s.title}</span>
            <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
              {SECTION_LABEL[s.type]}
            </span>
            <button
              type="button"
              aria-label="Duplicar seção"
              onClick={(e) => {
                e.stopPropagation();
                duplicateSection(s.id);
              }}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Excluir seção"
              onClick={(e) => {
                e.stopPropagation();
                removeSection(s.id);
              }}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <Select value="" onValueChange={(v) => addSection(v as SectionType)}>
        <SelectTrigger className="h-9">
          <span className="flex items-center gap-1.5 text-sm">
            <Plus className="h-4 w-4" /> Adicionar seção
          </span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SECTION_LABEL) as SectionType[]).map((t) => (
            <SelectItem key={t} value={t}>
              {SECTION_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const propsPanel = (
    <Tabs defaultValue="secao">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="secao">Seção</TabsTrigger>
        <TabsTrigger value="aparencia">Aparência</TabsTrigger>
      </TabsList>
      <TabsContent value="secao" className="mt-3">
        {selected ? (
          <SectionProperties section={selected} onChange={(p) => updateSection(selected.id, p)} />
        ) : (
          <p className="text-sm text-muted-foreground">Selecione uma seção para editar.</p>
        )}
      </TabsContent>
      <TabsContent value="aparencia" className="mt-3">
        <AppearancePanel settings={quiz.settings} onChange={updateSettings} />
      </TabsContent>
    </Tabs>
  );

  const previewPanel = (
    <div className="space-y-3">
      <div className="flex justify-center">
        <DeviceSwitch device={device} onChange={setDevice} />
      </div>
      <QuizPreview
        section={selected}
        settings={quiz.settings}
        device={device}
        index={selectedIndex}
        total={sections.length}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Topo */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/modelar-quiz">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quizzes
          </Link>
        </Button>
        <Input
          value={quiz.name}
          onChange={(e) => updateQuiz({ name: e.target.value })}
          className="h-9 w-full max-w-xs"
        />
        <SaveIndicator state={saveState} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/modelar-quiz/leads/$id" params={{ id: quiz.id }}>
              <Users className="mr-1.5 h-4 w-4" /> Leads
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRunKey((k) => k + 1);
              setPreviewMode(true);
            }}
          >
            <Eye className="mr-1.5 h-4 w-4" /> Visualizar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={saveState === "saving"}
            onClick={async () => {
              await persist(quiz, sections);
              toast.success("Quiz salvo.");
            }}
          >
            Salvar
          </Button>
          <Button
            size="sm"
            className="bg-gradient-brand text-white"
            onClick={async () => {
              const next = {
                ...quiz,
                status: (quiz.status === "published" ? "draft" : "published") as Quiz["status"],
              };
              setQuiz(next);
              await persist(next, sections);
              toast.success(
                next.status === "published"
                  ? "Quiz publicado. O link já está no ar."
                  : "Quiz voltou para rascunho. O link público saiu do ar.",
              );
            }}
          >
            <Rocket className="mr-1.5 h-4 w-4" />
            {quiz.status === "published" ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      {quiz.status === "published" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <span className="font-medium text-emerald-400">Publicado</span>
          <code className="truncate rounded bg-muted px-2 py-1 text-xs">{publicUrl}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(publicUrl);
              toast.success("Link copiado");
            }}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar link
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Abrir
            </a>
          </Button>
        </div>
      )}


      {/* Mobile / tablet: abas */}
      <div className="lg:hidden">
        <Tabs value={mobilePanel} onValueChange={(v) => setMobilePanel(v as typeof mobilePanel)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="secoes">Seções</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="propriedades">Editar</TabsTrigger>
          </TabsList>
          <TabsContent value="secoes" className="mt-3 rounded-2xl border border-border bg-card p-3">
            {sectionsPanel}
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            {previewPanel}
          </TabsContent>
          <TabsContent
            value="propriedades"
            className="mt-3 rounded-2xl border border-border bg-card p-3"
          >
            {propsPanel}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: três colunas */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-card p-3">
          {sectionsPanel}
        </aside>
        <section className="rounded-2xl border border-border bg-background/40 p-4">
          {previewPanel}
        </section>
        <aside className="max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-card p-3">
          {propsPanel}
        </aside>
      </div>
    </div>
  );
}

function DeviceSwitch({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (d: PreviewDevice) => void;
}) {
  const items: { key: PreviewDevice; icon: typeof Monitor; label: string }[] = [
    { key: "desktop", icon: Monitor, label: "Desktop" },
    { key: "tablet", icon: Tablet, label: "Tablet" },
    { key: "mobile", icon: Smartphone, label: "Mobile" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-label={it.label}
          onClick={() => onChange(it.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            device === it.key
              ? "bg-brand/15 text-brand"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <it.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check className="h-3.5 w-3.5" /> Salvo agora
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <TriangleAlert className="h-3.5 w-3.5" /> Não foi possível salvar
      </span>
    );
  return null;
}
