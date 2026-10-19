import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ProGate } from "@/components/pro-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_PAGE_BACKGROUND, newPageButton, sectionButtons, salesPageUrl } from "@/lib/sales-page-layout";
import { parseDestination } from "@/lib/sales-page-elements";
import { cn } from "@/lib/utils";
import { BackgroundPanel, Choice, ElementPanel, DestinationPanel, Numeric } from "@/components/sales-page/element-panel";
import { PageRenderer } from "@/components/sales-page/page-renderer";
import type { GuaranteeBadgeSettings } from "@/components/sales-page/guarantee-badge";
import { getPage, updatePage, uploadPageImage } from "@/lib/sales-page-api";
import { buildPageHtml, downloadHtml, PAGE_FONTS, pageFontsHref } from "@/lib/sales-page-export";
import {
  BLOCKS,
  BLOCK_MAP,
  newSection,
  slugify,
  uid,
  type FieldDef,
  type PageSection,
  type PageSettings,
  type SalesPage,
  type SectionStyle,
  type PageButton,
} from "@/lib/sales-page-types";

export const Route = createFileRoute("/criador-paginas/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Editor de página de venda — Modelads" },
      { name: "description", content: "Edite sua página de venda com preview ao vivo." },
      { property: "og:title", content: "Editor de página de venda — Modelads" },
      { property: "og:description", content: "Edite sua página de venda com preview ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorGate,
});

function EditorGate() {
  const { isPro, loading } = useAuth();
  // Editor em tela cheia: fora do layout padrão para aproveitar todo o espaço.
  if (!loading && isPro) return <EditorLoader />;
  return <ProGate icon={LayoutTemplate} title="Criador de Páginas de Venda" description="Edite sua página com preview ao vivo." />;
}

function EditorLoader() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["sales-page", id], queryFn: () => getPage(id), staleTime: Infinity, refetchOnWindowFocus: false });
  if (isLoading) return <div className="grid h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data)
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p>Página não encontrada.</p>
        <Button asChild className="mt-4" variant="outline"><Link to="/criador-paginas">Voltar</Link></Button>
      </div>
    );
  return <Editor key={data.id} initial={data} />;
}

type Snap = { sections: PageSection[]; settings: PageSettings };

function setPath(obj: Record<string, any>, path: string, value: unknown) {
  const keys = path.split(".");
  const root = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur: any = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] ?? {}) };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}

function Editor({ initial }: { initial: SalesPage }) {
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snap>({ sections: initial.sections, settings: initial.settings });
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const currentSnap = useRef(snap);
  const history = useRef<{ past: Snap[]; future: Snap[] }>({ past: [], future: [] });
  const lastPush = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const [meta, setMeta] = useState({ name: initial.name, slug: initial.slug, status: initial.status });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"section" | "page">("page");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [save, setSave] = useState<"saved" | "saving" | "error" | "dirty">("saved");
  const [mobilePane, setMobilePane] = useState<"sections" | "preview" | "props">("preview");
  const dragFrom = useRef<number | null>(null);

  /** Aplica uma alteração registrando histórico (alterações seguidas no mesmo campo viram um passo). */
  const commit = useCallback((fn: (s: Snap) => Snap, key = uid()) => {
      const cur = currentSnap.current;
      const next = fn(cur);
      if (next === cur) return;
      const now = Date.now();
      if (!(lastPush.current.key === key && now - lastPush.current.at < 800)) {
        history.current = { past: [...history.current.past.slice(-79), cur], future: [] };
      }
      lastPush.current = { key, at: now };
      currentSnap.current = next;
      setSnap(next);
      setPast(history.current.past);
      setFuture(history.current.future);
  }, []);

  const undo = useCallback(() => {
      const h = history.current;
      const prev = h.past.at(-1);
      if (!prev) return;
      history.current = { past: h.past.slice(0, -1), future: [currentSnap.current, ...h.future] };
      currentSnap.current = prev;
      setSnap(prev);
      setPast(history.current.past);
      setFuture(history.current.future);
      lastPush.current = { key: "", at: 0 };
  }, []);
  const redo = useCallback(() => {
      const h = history.current;
      const nxt = h.future[0];
      if (!nxt) return;
      history.current = { past: [...h.past, currentSnap.current], future: h.future.slice(1) };
      currentSnap.current = nxt;
      setSnap(nxt);
      setPast(history.current.past);
      setFuture(history.current.future);
      lastPush.current = { key: "", at: 0 };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Salvamento automático
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setSave("dirty");
    const t = setTimeout(async () => {
      setSave("saving");
      try {
        await updatePage(initial.id, { sections: snap.sections, settings: snap.settings });
        setSave("saved");
      } catch {
        setSave("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [snap, initial.id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  // Fontes do preview
  const fontsHref = useMemo(() => pageFontsHref(snap.settings, snap.sections), [snap.settings, snap.sections]);
  useEffect(() => {
    if (!fontsHref) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = fontsHref;
    document.head.appendChild(l);
    return () => l.remove();
  }, [fontsHref]);

  const sections = snap.sections;
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const updateSection = (id: string, fn: (s: PageSection) => PageSection, key?: string) =>
    commit((cur) => ({ ...cur, sections: cur.sections.map((s) => (s.id === id ? fn(s) : s)) }), key);
  const setContent = (id: string, path: string, v: unknown) => updateSection(id, s => {
    if (path.startsWith("button:")) return { ...s, content: { ...s.content, buttons: sectionButtons(s).map(b => b.id === path.slice(7) ? { ...b, text: String(v) } : b) } };
    if (path.startsWith("custom:")) return { ...s, customElements: s.customElements?.map(el => el.id === path.slice(7) ? { ...el, value: String(v), button: el.button ? { ...el.button, text: String(v) } : undefined } : el) };
    const list = path.match(/^items\.(\d+)\.(checklist|features)\.(\d+)$/);
    if (list) { const lines = (s.content.items?.[Number(list[1])]?.[list[2]] || "").split("\n"); lines[Number(list[3])] = String(v); return { ...s, content: setPath(s.content, `items.${list[1]}.${list[2]}`, lines.join("\n")) }; }
    return { ...s, content: setPath(s.content, path, v) };
  }, `${id}:c:${path}`);
  const updateElement = (sid: string, key: string, patch: Record<string, unknown>) => updateSection(sid, s => ({ ...s, elementStyles: { ...s.elementStyles, [key]: { ...s.elementStyles?.[key], ...patch } } }), `${sid}:element:${key}:${Object.keys(patch).join()}`);
  const elementButton = (section: PageSection, key: string, b: PageButton) => {
    if (key.startsWith("custom:")) updateSection(section.id, s => ({ ...s, customElements: s.customElements?.map(el => `custom:${el.id}` === key ? { ...el, button: b, value: b.text } : el) }));
    else if (key.startsWith("items.")) { const i = Number(key.split(".")[1]); updateSection(section.id, s => ({ ...s, content: { ...s.content, items: s.content.items?.map((it, j) => j === i ? { ...it, buttonUrl: b.url, destination: JSON.stringify(b.destination), buttonText: b.text } : it) } })); }
    else setContent(section.id, "buttons", sectionButtons(section).map((it, i) => `button:${it.id}` === key || key === `buttons.${i}.text` || key === "buttonText" && i === 0 ? b : it));
  };
  const setStyle = (id: string, patch: Partial<SectionStyle>) => updateSection(id, (s) => ({ ...s, style: { ...s.style, ...patch } }), `${id}:s:${Object.keys(patch).join()}`);
  const setSettings = (path: string, v: unknown) => commit((cur) => ({ ...cur, settings: setPath(cur.settings, path, v) as PageSettings }), `settings:${path}`);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    commit((cur) => {
      const arr = [...cur.sections];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return { ...cur, sections: arr };
    });
  };
  const addSection = (type: PageSection["type"]) => {
    const sec = newSection(type);
    commit((cur) => {
      const idx = selectedId ? cur.sections.findIndex((s) => s.id === selectedId) : -1;
      const arr = [...cur.sections];
      arr.splice(idx >= 0 ? idx + 1 : arr.length, 0, sec);
      return { ...cur, sections: arr };
    });
    setSelectedId(sec.id);
    setTab("section");
    setLibraryOpen(false);
    setTimeout(() => document.querySelector(`[data-section-id="${sec.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  const duplicate = (id: string) =>
    commit((cur) => {
      const i = cur.sections.findIndex((s) => s.id === id);
      const copy = { ...structuredClone(cur.sections[i]), id: uid() };
      const arr = [...cur.sections];
      arr.splice(i + 1, 0, copy);
      return { ...cur, sections: arr };
    });
  const remove = (id: string) => {
    commit((cur) => ({ ...cur, sections: cur.sections.filter((s) => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const select = (id: string | null) => {
    setSelectedElement(null);
    setSelectedId(id);
    setTab(id ? "section" : "page");
  };

  const saveMeta = async (patch: Partial<typeof meta>) => {
    try {
      await updatePage(initial.id, patch);
      setMeta((m) => ({ ...m, ...patch }));
      return true;
    } catch (e) {
      toast.error((e as Error).message === "slug_taken" ? "Este endereço já está em uso." : "Não foi possível salvar.");
      return false;
    }
  };

  const publicUrl = salesPageUrl(meta.slug);
  const togglePublish = async () => {
    await updatePage(initial.id, { sections: snap.sections, settings: snap.settings });
    const status = meta.status === "published" ? "draft" : "published";
    if (await saveMeta({ status })) {
      if (status === "published") {
        void navigator.clipboard?.writeText(publicUrl).catch(() => {});
        toast.success("Página publicada! Link copiado.", { description: publicUrl });
      } else toast.success("Página voltou para rascunho.");
    }
  };

  const exportHtml = () => {
    downloadHtml(`${meta.slug || "pagina"}.html`, buildPageHtml(meta.name, snap.settings, snap.sections));
    toast.success("HTML exportado.");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/60 px-3 py-2">
        <Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link to="/criador-paginas" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <input
          value={meta.name}
          onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
          onBlur={() => meta.name.trim() && saveMeta({ name: meta.name.trim() })}
          className="min-w-0 max-w-[220px] flex-1 rounded-md bg-transparent px-2 py-1 font-display text-sm font-bold outline-none hover:bg-accent focus:bg-accent"
        />
        <SaveBadge state={save} />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!past.length} onClick={undo} title="Desfazer (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!future.length} onClick={redo} title="Refazer (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
          <div className="mx-1 hidden rounded-lg border border-border p-0.5 sm:flex">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={cn("rounded-md px-2 py-1", device === d ? "bg-accent text-foreground" : "text-muted-foreground")} title={d === "desktop" ? "Computador" : "Celular"}>
                {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportHtml}><Download className="mr-1 h-3.5 w-3.5" /> HTML</Button>
          {meta.status === "published" && (
            <Button size="sm" variant="outline" onClick={() => (navigator.clipboard.writeText(publicUrl), toast.success("Link copiado."))}><LinkIcon className="mr-1 h-3.5 w-3.5" /> Copiar link</Button>
          )}
          <Button size="sm" onClick={togglePublish} className={meta.status === "published" ? "" : "bg-gradient-brand text-primary-foreground"} variant={meta.status === "published" ? "secondary" : "default"}>
            {meta.status === "published" ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      {/* Abas no celular */}
      <div className="flex border-b border-border lg:hidden">
        {([["sections", "Seções"], ["preview", "Preview"], ["props", "Editar"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMobilePane(k)} className={cn("flex-1 py-2 text-xs font-semibold", mobilePane === k ? "border-b-2 border-brand text-foreground" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Esquerda: seções */}
        <aside className={cn("w-full shrink-0 overflow-y-auto border-r border-border bg-card/40 p-3 lg:block lg:w-64", mobilePane === "sections" ? "block" : "hidden")}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Seções</span>
            <Button size="sm" variant="secondary" className="h-7" onClick={() => setLibraryOpen((v) => !v)}>
              {libraryOpen ? <X className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />} {libraryOpen ? "Fechar" : "Adicionar"}
            </Button>
          </div>

          {libraryOpen && (
            <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-background p-2">
              {BLOCKS.map((b) => (
                <button key={b.type} onClick={() => addSection(b.type)} title={b.description} className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-left text-xs hover:border-brand/50 hover:bg-accent">
                  <span>{b.emoji}</span>
                  <span className="truncate font-medium">{b.label}</span>
                </button>
              ))}
            </div>
          )}

          {sections.length === 0 && !libraryOpen && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhuma seção ainda. Clique em “Adicionar”.</p>}

          <ul className="space-y-1">
            {sections.map((s, i) => {
              const def = BLOCK_MAP[s.type];
              return (
                <li
                  key={s.id}
                  draggable
                  onDragStart={() => (dragFrom.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom.current !== null) move(dragFrom.current, i);
                    dragFrom.current = null;
                  }}
                  onClick={() => {
                    select(s.id);
                    setTimeout(() => document.querySelector(`[data-section-id="${s.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
                  }}
                  className={cn(
                    "group flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-1.5 text-xs transition-colors",
                    selectedId === s.id ? "border-brand bg-brand/10" : "border-transparent hover:bg-accent",
                    s.hidden && "opacity-50",
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" />
                  <span>{def?.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{def?.label}</span>
                  <div className="flex opacity-60 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <IconBtn title="Subir" onClick={() => move(i, i - 1)}><ArrowUp className="h-3 w-3" /></IconBtn>
                    <IconBtn title="Descer" onClick={() => move(i, i + 1)}><ArrowDown className="h-3 w-3" /></IconBtn>
                    <IconBtn title={s.hidden ? "Mostrar" : "Ocultar"} onClick={() => updateSection(s.id, (x) => ({ ...x, hidden: !x.hidden }))}>{s.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</IconBtn>
                    <IconBtn title="Duplicar" onClick={() => duplicate(s.id)}><Copy className="h-3 w-3" /></IconBtn>
                    <IconBtn title="Remover" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></IconBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Centro: preview */}
        <main className={cn("min-w-0 flex-1 overflow-y-auto bg-muted/30 p-3 sm:p-5 lg:block", mobilePane === "preview" ? "block" : "hidden")} onClick={() => select(null)}>
          <div
            className={cn("mx-auto overflow-hidden bg-background shadow-2xl transition-all duration-300", device === "mobile" ? "max-w-[390px] rounded-[28px] ring-8 ring-foreground/80" : "max-w-full rounded-lg")}
          >
            <PageRenderer
              sections={sections}
              settings={snap.settings}
              editable
              selectedId={selectedId}
              onSelect={(id) => select(id)}
              onText={(sid, path, v) => setContent(sid, path, v)}
              onElementSelect={(sid, key) => { const section = sections.find(s => s.id === sid); const buttonIndex = key === "buttonText" ? 0 : /^buttons\.\d+\.text$/.test(key) ? Number(key.split(".")[1]) : undefined; const button = section && buttonIndex !== undefined ? sectionButtons(section)[buttonIndex] : undefined; setSelectedId(sid); setSelectedElement(button ? `button:${button.id}` : key); setTab("section"); }}
              onElementAction={(sid, key, action) => { updateElement(sid, key, { [action]: true }); setSelectedElement(null); }}
              onOrder={(sid, order, group) => updateSection(sid, s => group ? ({ ...s, groupOrders: { ...s.groupOrders, [group]: order } }) : ({ ...s, elementOrder: order }))}
            />
          </div>
        </main>

        {/* Direita: propriedades */}
        <aside className={cn("w-full shrink-0 overflow-y-auto border-l border-border bg-card/40 lg:block lg:w-80", mobilePane === "props" ? "block" : "hidden")}>
          <div className="sticky top-0 z-10 flex border-b border-border bg-card">
            <button disabled={!selected} onClick={() => setTab("section")} className={cn("flex-1 py-2.5 text-xs font-semibold disabled:opacity-40", tab === "section" ? "border-b-2 border-brand" : "text-muted-foreground")}>Seção</button>
            <button onClick={() => setTab("page")} className={cn("flex-1 py-2.5 text-xs font-semibold", tab === "page" ? "border-b-2 border-brand" : "text-muted-foreground")}>Página</button>
          </div>
          <div className="space-y-5 p-4">
            {tab === "section" && selected && selectedElement ? <><Button size="sm" variant="ghost" onClick={() => setSelectedElement(null)}><ArrowLeft size={14}/>Seção inteira</Button><ElementPanel section={selected} elementKey={selectedElement} sections={sections} userId={user?.id || ""} onStyle={patch => updateElement(selected.id, selectedElement, patch)} onContent={(key, value) => setContent(selected.id, key, value)} onValue={value => setContent(selected.id, selectedElement, value)} onButton={b => elementButton(selected, selectedElement, b)}/></> : tab === "section" && selected ? (
              <SectionPanel
                key={selected.id}
                section={selected}
                sections={sections}
                onSection={fn => updateSection(selected.id, fn)}
                userId={user?.id ?? ""}
                onContent={(p, v) => setContent(selected.id, p, v)}
                onStyle={(p) => setStyle(selected.id, p)}
                onVisibility={(hidden) => updateSection(selected.id, s => ({ ...s, hidden }))}
                onItems={(items) => updateSection(selected.id, s => {
                  const old = s.content.items || [];
                  const remap = (key: string) => key.replace(/^items\.(\d+)(?=\.|$)/, (_, index) => { const next = items.indexOf(old[Number(index)]); return next < 0 ? "retired" : `items.${next}`; });
                  return { ...s, content: { ...s.content, items }, elementStyles: Object.fromEntries(Object.entries(s.elementStyles || {}).map(([key, value]) => [remap(key), value]).filter(([key]) => !(key as string).startsWith("retired"))), groupOrders: Object.fromEntries(Object.entries(s.groupOrders || {}).map(([key, order]) => [remap(key), order.map(remap).filter(k => !k.startsWith("retired"))]).filter(([key]) => !(key as string).startsWith("retired"))) };
                })}
              />
            ) : (
              <PagePanel settings={snap.settings} set={setSettings} userId={user?.id ?? ""} slug={meta.slug} onSlug={(slug) => saveMeta({ slug })} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
      {children}
    </button>
  );
}

function SaveBadge({ state }: { state: "saved" | "saving" | "error" | "dirty" }) {
  const map = {
    saved: [<Check key="i" className="h-3 w-3" />, "Salvo"],
    saving: [<Loader2 key="i" className="h-3 w-3 animate-spin" />, "Salvando..."],
    dirty: [<Cloud key="i" className="h-3 w-3" />, "Alterações pendentes"],
    error: [<X key="i" className="h-3 w-3" />, "Erro ao salvar"],
  } as const;
  return <span className={cn("hidden items-center gap-1 text-[11px] sm:flex", state === "error" ? "text-destructive" : "text-muted-foreground")}>{map[state][0]} {map[state][1]}</span>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange, tokens = true }: { label: string; value?: string; onChange: (v: string | undefined) => void; tokens?: boolean }) {
  const isHex = !!value && value.startsWith("#");
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={isHex ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 cursor-pointer rounded border border-border bg-transparent" />
        <Input value={value ?? ""} placeholder="Padrão" onChange={(e) => onChange(e.target.value || undefined)} className="h-8 flex-1 text-xs" />
        {tokens && value && (
          <button onClick={() => onChange(undefined)} title="Usar padrão" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1, suffix = "px" }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[hsl(var(--brand,230_100%_71%))]" />
    </div>
  );
}

function FontSelect({ value, onChange, allowDefault }: { value?: string; onChange: (v: string | undefined) => void; allowDefault?: boolean }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
      {allowDefault && <option value="">Padrão da página</option>}
      {PAGE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  );
}

function ImageField({ label, value, onChange, userId }: { label: string; value: string; onChange: (v: string) => void; userId: string }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {value && <img src={value} alt="" className="h-24 w-full rounded-md border border-border object-cover" />}
      <div className="flex gap-1.5">
        <Input value={value} placeholder="https://..." onChange={(e) => onChange(e.target.value)} className="h-8 flex-1 text-xs" />
        <Button type="button" size="sm" variant="secondary" className="h-8" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
        {value && <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => onChange("")}><X className="h-3.5 w-3.5" /></Button>}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) return void toast.error("Imagem muito grande (máx. 5 MB).");
          setBusy(true);
          try {
            onChange(await uploadPageImage(userId, f));
          } catch {
            toast.error("Não foi possível enviar a imagem.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function Field({ def, value, onChange, userId }: { def: FieldDef; value: string; onChange: (v: string) => void; userId: string }) {
  if (def.kind === "image") return <ImageField label={def.label} value={value ?? ""} onChange={onChange} userId={userId} />;
  if (def.kind === "checkbox") return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={String(value) === "true"} onChange={e => onChange(String(e.target.checked))}/>{def.label}</label>;
  if (def.kind === "color") return <ColorField label={def.label} value={value} onChange={v => onChange(v ?? "")} />;
  if (def.kind === "select") return <div className="space-y-1"><Label className="text-xs">{def.label}</Label><select aria-label={def.label} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={value || ""} onChange={e => onChange(e.target.value)}>{def.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{def.label}</Label>
      {def.kind === "textarea" ? (
        <Textarea aria-label={def.label} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="text-sm" />
      ) : (
        <Input
          aria-label={def.label}
          type={def.kind === "datetime" ? "datetime-local" : def.kind === "number" ? "number" : "text"}
          value={value ?? ""}
          placeholder={def.kind === "url" ? "https://pay.exemplo.com/..." : def.kind === "video" ? "Link do YouTube, Vimeo ou .mp4" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}

    </div>
  );
}

function BadgePanel({ badge, onChange, userId }: { badge: GuaranteeBadgeSettings; userId: string; onChange: (next: GuaranteeBadgeSettings) => void }) {
  const set = (patch: Partial<GuaranteeBadgeSettings>) => onChange({ ...badge, ...patch });
  return <div className="space-y-3">
    <Choice label="Tipo de selo" value={badge.mode || "default"} options={[["default", "Selo padrão"], ["image", "Imagem enviada"]]} set={mode => set({ mode: mode as "default" | "image" })}/>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!badge.hidden} onChange={e => set({ hidden: !e.target.checked })}/>Selo visível</label>
    {badge.mode === "image" ? <ImageField label="Imagem do selo" value={badge.image || ""} userId={userId} onChange={image => set({ image })}/> : <>
    <Field def={{ key: "days", label: "Dias de garantia", kind: "number" }} value={badge.days || "7"} userId="" onChange={days => set({ days })}/>
    <Field def={{ key: "top", label: "Texto curto do selo", kind: "text" }} value={badge.topText ?? "GARANTIA"} userId="" onChange={topText => set({ topText })}/>

    <Label className="text-xs">Estilo do selo</Label><select aria-label="Estilo do selo" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={badge.variant || "gold"} onChange={e => set({ variant: e.target.value })}><option value="gold">Dourado metálico</option><option value="navy">Azul-marinho com dourado</option><option value="green">Verde</option><option value="purple">Roxo</option><option value="custom">Cor personalizada</option></select>
    {badge.variant === "custom" && <ColorField label="Cor do selo" value={badge.color} onChange={color => set({ color })}/>}
    </>}
    <NumberField label="Tamanho do selo" value={badge.size ?? 180} min={64} max={320} onChange={size => set({ size })}/>
  </div>;
}

function SectionPanel({
  section,
  sections,
  onSection,
  userId,
  onContent,
  onStyle,
  onItems,
  onVisibility,
}: {
  section: PageSection;
  sections: PageSection[];
  onSection: (fn: (s: PageSection) => PageSection) => void;
  userId: string;
  onContent: (path: string, v: unknown) => void;
  onStyle: (p: Partial<SectionStyle>) => void;
  onItems: (items: Record<string, string>[]) => void;
  onVisibility: (hidden: boolean) => void;
}) {
  const [subtab, setSubtab] = useState<"content" | "font" | "color" | "layout">("content");
  const [uploadingPrints, setUploadingPrints] = useState(false);
  const printsInput = useRef<HTMLInputElement>(null);
  const buttons = sectionButtons(section);
  const updateButtons = (next: PageButton[]) => onContent("buttons", next);
  const def = BLOCK_MAP[section.type];
  const st = section.style ?? {};
  const items = (section.content.items ?? []) as Record<string, string>[];
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xl">{def.emoji}</span>
        <div>
          <div className="text-sm font-bold">{def.label}</div>

        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-border pb-2">
        {([['content', 'Conteúdo'], ['font', 'Fonte'], ['color', 'Cor'], ['layout', 'Layout']] as const).map(([key, label]) => <Button key={key} size="sm" variant={subtab === key ? 'secondary' : 'ghost'} className="px-1 text-xs" onClick={() => setSubtab(key)}>{label}</Button>)}
      </div>
      {subtab === "content" && <>
      <Group title="Conteúdo">
        {def.fields.filter(f => {
          if (["buttonText", "buttonUrl"].includes(f.key)) return false;
          if (section.type !== "announcement") return true;
          const mode = announcementMode(section.content);
          if (["dateAutomatic", "dateText"].includes(f.key)) return mode === "date" && (f.key !== "dateText" || section.content.dateAutomatic === "false");
          if (["timerType", "endAt", "durationSeconds", "expiry", "expiredText"].includes(f.key)) return mode === "countdown" && (f.key !== "endAt" || section.content.timerType !== "duration") && (f.key !== "durationSeconds" || section.content.timerType === "duration");
          return true;
        }).map((f) => (
          <Field key={f.key} def={f} value={section.content[f.key]} onChange={(v) => onContent(f.key, v)} userId={userId} />
        ))}
      </Group>

      {section.type === "guarantee" && <Group title="Selo de garantia"><BadgePanel userId={userId} badge={{ days: section.content.days, ...section.content.badge }} onChange={badge => onContent("badge", badge)}/></Group>}
      <Group title="Adicionar elemento"><div className="flex flex-wrap gap-1">{(["text", "image", "button", "icon", "video"] as const).map(type => <Button key={type} size="sm" variant="outline" onClick={() => onSection(s => ({ ...s, customElements: [...(s.customElements || []), { id: uid(), type, value: type === "text" ? "Seu texto" : type === "button" ? "SAIBA MAIS" : type === "icon" ? "✓" : "" }] }))}><Plus size={12}/>{({ text: "Texto", image: "Imagem", button: "Botão", icon: "Ícone", video: "Vídeo" })[type]}</Button>)}</div></Group>
      {Object.entries(section.elementStyles || {}).some(([, v]) => v.hidden || v.removed) && <Group title="Elementos ocultos ou removidos">{Object.entries(section.elementStyles || {}).filter(([, v]) => v.hidden || v.removed).map(([key]) => <Button key={key} size="sm" variant="outline" className="max-w-full whitespace-normal" onClick={() => onSection(s => ({ ...s, elementStyles: { ...s.elementStyles, [key]: { ...s.elementStyles?.[key], hidden: false, removed: false } } }))}><Eye size={14}/>Restaurar {key}</Button>)}</Group>}
      {section.type === "pricingPlans" && <><Numeric label="Quantidade de planos" value={items.length} min={2} max={4} set={n => { if (!n) return; const next = items.slice(0, n); while (next.length < n) next.push({ ...def.items?.blank }); onItems(next); }}/><Choice label="Plano popular" value={String(section.content.popularPlan ?? Math.max(0, items.findIndex(it => it.highlighted === "true")))} options={items.map((it, i) => [String(i), it.title || `Plano ${i + 1}`])} set={v => onContent("popularPlan", v)}/></>}
      {section.type === "printCarousel" && <div>
        <Button variant="outline" className="w-full" size="sm" disabled={uploadingPrints} onClick={() => printsInput.current?.click()}>{uploadingPrints ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}Enviar várias imagens</Button>
        <input ref={printsInput} hidden type="file" multiple accept="image/*" onChange={async e => {
          const files = Array.from(e.target.files ?? []); e.target.value = "";
          if (!files.length) return;
          if (files.some(f => !f.type.startsWith("image/") || f.size > 5 * 1024 * 1024)) { toast.error("Use imagens de até 5 MB cada."); return; }
          setUploadingPrints(true);
          try { const images = await Promise.all(files.map(file => uploadPageImage(userId, file))); onItems([...items, ...images.map(image => ({ image, caption: "" }))]); }
          catch { toast.error("Não foi possível enviar as imagens."); }
          finally { setUploadingPrints(false); }
        }}/>
      </div>}
      {def.hasButton && <Group title="Botões">
        {buttons.map((button, i) => <div key={button.id} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold">Botão {i + 1}</span><Button variant="ghost" size="icon" title="Remover botão" aria-label={`Remover botão ${i + 1}`} onClick={() => updateButtons(buttons.filter(b => b.id !== button.id))}><Trash2 size={14}/></Button></div>
          <Field def={{ key: "text", label: "Texto do botão", kind: "text" }} value={button.text} userId={userId} onChange={text => updateButtons(buttons.map(b => b.id === button.id ? { ...b, text } : b))}/>
          <DestinationPanel button={button} sections={sections} set={next => updateButtons(buttons.map(b => b.id === button.id ? next : b))}/>
          <Label className="text-xs">Estilo do botão</Label><select aria-label={`Estilo do botão ${i + 1}`} value={button.variant ?? "solid"} onChange={e => updateButtons(buttons.map(b => b.id === button.id ? { ...b, variant: e.target.value as PageButton['variant'] } : b))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="solid">Preenchido</option><option value="outline">Contorno</option><option value="text">Somente texto</option></select>
          <NumberField label="Cantos do botão" value={button.radius ?? 12} min={0} max={40} onChange={radius => updateButtons(buttons.map(b => b.id === button.id ? { ...b, radius } : b))}/>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!button.guarantee} onChange={e => updateButtons(buttons.map(b => b.id === button.id ? { ...b, guarantee: e.target.checked ? { days: "7", size: 80 } : undefined } : b))}/>Selo de garantia junto ao botão</label>
          {button.guarantee && <details><summary className="cursor-pointer text-xs font-semibold">Personalizar selo</summary><div className="mt-3"><BadgePanel userId={userId} badge={button.guarantee} onChange={guarantee => updateButtons(buttons.map(b => b.id === button.id ? { ...b, guarantee } : b))}/></div></details>}
        </div>)}
        <Button variant="outline" size="sm" className="w-full" onClick={() => updateButtons([...buttons, newPageButton()])}><Plus size={14} className="mr-2"/>Adicionar botão</Button>
      </Group>}
      {def.items && (
        <Group title={`${def.items.label}s`}>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border bg-background/50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{def.items?.label} {i + 1}</span>
                <div className="flex">
                  <IconBtn title="Subir" onClick={() => { if (i > 0) { const a = [...items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onItems(a); } }}><ArrowUp className="h-3 w-3" /></IconBtn>
                  <IconBtn title="Descer" onClick={() => { if (i < items.length - 1) { const a = [...items]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; onItems(a); } }}><ArrowDown className="h-3 w-3" /></IconBtn>
                  <IconBtn title="Duplicar" onClick={() => { if (section.type === "pricingPlans" && items.length >= 4) return; const a = [...items]; a.splice(i + 1, 0, { ...it }); onItems(a); }}><Copy className="h-3 w-3" /></IconBtn>
                  <IconBtn title="Remover" onClick={() => { if (section.type !== "pricingPlans" || items.length > 2) onItems(items.filter((_, j) => j !== i)); }}><Trash2 className="h-3 w-3" /></IconBtn>
                </div>
              </div>
              {section.type === "pricingPlans" && <DestinationPanel button={{ id: String(i), text: it.buttonText, url: it.buttonUrl || "", destination: parseDestination(it.destination) }} sections={sections} set={b => onItems(items.map((item, j) => j === i ? { ...item, buttonUrl: b.url, destination: JSON.stringify(b.destination) } : item))}/>}
              {def.items?.fields.filter(f => section.type !== "pricingPlans" || f.key !== "buttonUrl").map((f) => (
                <Field key={f.key} def={f} value={it[f.key]} onChange={(v) => onContent(`items.${i}.${f.key}`, v)} userId={userId} />
              ))}
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full" disabled={section.type === "pricingPlans" && items.length >= 4} onClick={() => onItems([...items, { ...def.items?.blank }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar {def.items.label.toLowerCase()}
          </Button>
        </Group>
      )}

      </>}
      {subtab === "font" && <Group title="Fonte">
        <div className="space-y-1">
          <Label className="text-xs">Fonte</Label>
          <FontSelect value={st.font} onChange={(v) => onStyle({ font: v })} allowDefault />
        </div>
        <div className="space-y-1"><Label className="text-xs">Peso da fonte</Label><select aria-label="Peso da fonte" value={st.weight ?? 400} onChange={e => onStyle({ weight: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{[400,600,700,800,900].map(w => <option key={w} value={w}>{w}</option>)}</select></div>
        <NumberField label="Tamanho do título" value={st.titleSize ?? (section.type === "hero" ? 48 : 34)} min={18} max={80} onChange={(v) => onStyle({ titleSize: v })} />
        <NumberField label="Tamanho do texto" value={st.textSize ?? 17} min={12} max={26} onChange={(v) => onStyle({ textSize: v })} />
        <div className="space-y-1">
          <Label className="text-xs">Alinhamento</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-0.5">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} onClick={() => onStyle({ align: a })} className={cn("rounded-md py-1 text-xs", (st.align ?? "center") === a ? "bg-accent font-semibold" : "text-muted-foreground")}>
                {a === "left" ? "Esquerda" : a === "center" ? "Centro" : "Direita"}
              </button>
            ))}
          </div>
        </div>
      </Group>}

      {subtab === "color" && <Group title="Cor">
        <BackgroundPanel value={st.background} color={st.bg} userId={userId} onChange={background => onStyle({ background })} onColor={bg => onStyle({ bg })}/>
        <div className="flex gap-1.5">
          {(["bg", "surface", "primary"] as const).map((t) => (
            <button key={t} onClick={() => onStyle({ bg: t })} className={cn("flex-1 rounded-md border px-1 py-1 text-[10px]", st.bg === t ? "border-brand" : "border-border")}>
              {t === "bg" ? "Fundo" : t === "surface" ? "Superfície" : "Cor principal"}
            </button>
          ))}
        </div>
        <ColorField label="Cor do texto" value={st.color} onChange={(v) => onStyle({ color: v })} />
        <ColorField label="Cor de destaque" value={st.accent} onChange={(v) => onStyle({ accent: v })} />
        {def.hasButton && <>
          <ColorField label="Cor padrão dos botões" value={st.buttonBg} onChange={v => onStyle({ buttonBg: v })}/>
          <ColorField label="Texto padrão dos botões" value={st.buttonColor} onChange={v => onStyle({ buttonColor: v })}/>
          {buttons.map((b, i) => <div key={b.id} className="space-y-3 border-t border-border pt-3"><Label>Botão {i + 1}</Label>
            <ColorField label="Cor do botão" value={b.bg} onChange={bg => updateButtons(buttons.map(x => x.id === b.id ? { ...x, bg } : x))}/>
            <ColorField label="Cor do texto do botão" value={b.color} onChange={color => updateButtons(buttons.map(x => x.id === b.id ? { ...x, color } : x))}/>
          </div>)}
        </>}
      </Group>}

      {subtab === "layout" && <Group title="Layout">
        {["bonusCards", "iconCards", "pricingPlans", "steps", "benefits"].includes(section.type) && <NumberField label="Colunas" value={st.columns ?? 3} min={2} max={section.type === "bonusCards" ? 3 : 4} suffix="" onChange={columns => onStyle({ columns })}/>}
        {section.type === "finalCta" && <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.background?.type === "gradient"} onChange={e => onStyle({ background: e.target.checked ? { ...DEFAULT_PAGE_BACKGROUND, type: "gradient" } : undefined })}/>Fundo em degradê</label>
          {st.background?.type === "gradient" && <>
            {st.background.stops.map((stop, i) => <ColorField key={i} label={`Cor do degradê ${i + 1}`} value={stop.color} onChange={color => { if (color && st.background) onStyle({ background: { ...st.background, stops: st.background.stops.map((s, j) => i === j ? { ...s, color } : s) } }); }}/>) }
            <NumberField label="Ângulo do degradê" value={st.background.angle} min={0} max={360} suffix="°" onChange={angle => { if (st.background) onStyle({ background: { ...st.background, angle } }); }}/>
          </>}
        </>}
        <NumberField label="Espaço vertical" value={st.paddingY ?? 64} min={0} max={160} step={4} onChange={(v) => onStyle({ paddingY: v })} />
        <NumberField label="Distância entre elementos" value={st.gap ?? 20} min={0} max={100} onChange={gap => onStyle({ gap })}/>
        <NumberField label="Largura da seção" value={st.maxWidth ?? 1080} min={320} max={1400} step={20} onChange={maxWidth => onStyle({ maxWidth })}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!section.hidden} onChange={e => onVisibility(!e.target.checked)}/>Seção visível</label>
      </Group>}
    </>
  );
}

function PagePanel({ settings, set, userId, slug, onSlug }: { settings: PageSettings; set: (p: string, v: unknown) => void; userId: string; slug: string; onSlug: (s: string) => Promise<boolean> }) {
  const [slugDraft, setSlugDraft] = useState(slug);
  useEffect(() => setSlugDraft(slug), [slug]);
  const background = settings.background ?? { ...DEFAULT_PAGE_BACKGROUND, stops: [{ color: settings.colors.bg, position: 0 }, { color: settings.colors.primary, position: 100 }] };
  const setBackground = (patch: Partial<typeof background>) => set("background", { ...background, ...patch });
  const palette: [keyof PageSettings["colors"], string][] = [
    ["primary", "Cor principal (botões)"],
    ["buttonText", "Texto dos botões"],
    ["bg", "Fundo"],
    ["surface", "Superfície (cards)"],
    ["text", "Texto"],
    ["muted", "Texto secundário"],
  ];
  return (
    <>
      <Group title="Endereço público">
        <div className="flex gap-1.5">
          <div className="flex flex-1 items-center rounded-md border border-input bg-background pl-2 text-xs text-muted-foreground">
            /p/
            <input value={slugDraft} onChange={(e) => setSlugDraft(slugify(e.target.value))} className="h-8 min-w-0 flex-1 bg-transparent px-1 text-foreground outline-none" />
          </div>
          <Button size="sm" variant="secondary" className="h-8" disabled={!slugDraft || slugDraft === slug} onClick={async () => (await onSlug(slugDraft)) && toast.success("Endereço atualizado.")}>Salvar</Button>
        </div>
      </Group>

      <Group title="Fontes">
        <div className="space-y-1"><Label className="text-xs">Títulos</Label><FontSelect value={settings.headingFont} onChange={(v) => set("headingFont", v ?? "Poppins")} /></div>
        <div className="space-y-1"><Label className="text-xs">Textos</Label><FontSelect value={settings.font} onChange={(v) => set("font", v ?? "Inter")} /></div>
      </Group>

      <Group title="Paleta de cores">
        {palette.map(([k, l]) => (
          <ColorField key={k} label={l} value={settings.colors[k]} tokens={false} onChange={(v) => v && set(`colors.${k}`, v)} />
        ))}
      </Group>

      <Group title="Fundo da página">
        <select aria-label="Tipo de fundo" value={background.type} onChange={e => setBackground({ type: e.target.value as typeof background.type })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="solid">Cor sólida</option><option value="gradient">Degradê</option><option value="image">Imagem</option></select>
        {background.type === "solid" && <ColorField label="Cor sólida" value={settings.colors.bg} tokens={false} onChange={v => v && set("colors.bg", v)}/>}
        {background.type === "image" && <ImageField label="Imagem de fundo" value={background.image} userId={userId} onChange={image => setBackground({ image })}/>}
        {background.type === "gradient" && <>
          <select aria-label="Tipo de degradê" value={background.gradientType} onChange={e => setBackground({ gradientType: e.target.value as "linear" | "radial" })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="linear">Linear</option><option value="radial">Radial</option></select>
          {background.stops.map((stop, i) => <div key={i} className="space-y-2 border-t border-border pt-3">
            <ColorField label={`Cor ${i + 1}`} value={stop.color} tokens={false} onChange={color => color && setBackground({ stops: background.stops.map((s, j) => j === i ? { ...s, color } : s) })}/>
            <NumberField label={`Posição ${i + 1}`} value={stop.position} min={0} max={100} suffix="%" onChange={position => setBackground({ stops: background.stops.map((s, j) => j === i ? { ...s, position } : s) })}/>
            <Button variant="ghost" size="sm" disabled={background.stops.length <= 2} onClick={() => setBackground({ stops: background.stops.filter((_, j) => j !== i) })}><Trash2 size={14} className="mr-2"/>Remover cor</Button>
          </div>)}
          <Button variant="outline" size="sm" onClick={() => setBackground({ stops: [...background.stops, { color: settings.colors.primary, position: 100 }] })}><Plus size={14} className="mr-2"/>Adicionar cor</Button>
          {background.gradientType === "linear" ? <NumberField label="Ângulo" value={background.angle} min={0} max={360} suffix="°" onChange={angle => setBackground({ angle })}/> : <><NumberField label="Centro horizontal" value={background.centerX} min={0} max={100} suffix="%" onChange={centerX => setBackground({ centerX })}/><NumberField label="Centro vertical" value={background.centerY} min={0} max={100} suffix="%" onChange={centerY => setBackground({ centerY })}/></>}
        </>}
      </Group>
      <Group title="Layout">
        <NumberField label="Largura máxima do conteúdo" value={settings.maxWidth} min={640} max={1400} step={20} onChange={(v) => set("maxWidth", v)} />
        <NumberField label="Arredondamento" value={settings.radius} min={0} max={32} onChange={(v) => set("radius", v)} />
      </Group>

      <Group title="SEO e compartilhamento">
        <div className="space-y-1"><Label className="text-xs">Título da aba</Label><Input value={settings.seo.title} onChange={(e) => set("seo.title", e.target.value)} className="h-9 text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Descrição</Label><Textarea value={settings.seo.description} onChange={(e) => set("seo.description", e.target.value)} rows={2} className="text-sm" /></div>
        <ImageField label="Imagem de compartilhamento" value={settings.seo.image} onChange={(v) => set("seo.image", v)} userId={userId} />
        <ImageField label="Favicon" value={settings.favicon} onChange={(v) => set("favicon", v)} userId={userId} />
      </Group>

      <Group title="Pixel e scripts (opcional)">
        <div className="space-y-1">
          <Label className="text-xs">No cabeçalho (head)</Label>
          <Textarea value={settings.headScripts} onChange={(e) => set("headScripts", e.target.value)} rows={4} placeholder="<!-- Meta Pixel, Google Tag... -->" className="font-mono text-[11px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Antes de fechar o body</Label>
          <Textarea value={settings.bodyScripts} onChange={(e) => set("bodyScripts", e.target.value)} rows={3} className="font-mono text-[11px]" />
        </div>
        <p className="text-[10px] text-muted-foreground">Os scripts rodam apenas na página publicada e no HTML exportado.</p>
      </Group>
    </>
  );
}
