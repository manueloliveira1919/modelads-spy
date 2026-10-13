import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, LayoutTemplate, Loader2, Pencil, Plus, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { ProGate } from "@/components/pro-gate";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { createPage, deletePage, duplicatePage, listPages, updatePage } from "@/lib/sales-page-api";
import { PAGE_TEMPLATES, type SalesPage } from "@/lib/sales-page-types";

export const Route = createFileRoute("/criador-paginas/")({
  head: () => ({
    meta: [
      { title: "Criador de Páginas de Venda — Modelads" },
      { name: "description", content: "Monte páginas de venda profissionais com editor visual, blocos prontos e templates." },
      { property: "og:title", content: "Criador de Páginas de Venda — Modelads" },
      { property: "og:description", content: "Editor visual de páginas de venda com templates prontos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProGate icon={LayoutTemplate} title="Criador de Páginas de Venda" description="Monte páginas de venda prontas para converter, com editor visual e templates.">
      <ListContent />
    </ProGate>
  ),
});

function ListContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<SalesPage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SalesPage | null>(null);
  const { data: pages, isLoading, error } = useQuery({ queryKey: ["sales-pages", user?.id], queryFn: listPages, enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sales-pages"] });

  const dup = useMutation({ mutationFn: (id: string) => duplicatePage(id, user!.id), onSuccess: () => (toast.success("Página duplicada."), refresh()), onError: () => toast.error("Não foi possível duplicar.") });
  const del = useMutation({ mutationFn: deletePage, onSuccess: () => (toast.success("Página excluída."), refresh()), onError: () => toast.error("Não foi possível excluir.") });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-brand text-white">
          <Plus className="mr-1.5 h-4 w-4" /> Criar nova página
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />)}
        </div>
      )}
      {error && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">Não foi possível carregar suas páginas.</div>}

      {!isLoading && !error && (pages?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"><LayoutTemplate className="h-7 w-7" /></div>
          <h2 className="mt-4 font-display text-xl font-bold">Crie sua primeira página de venda</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Comece do zero ou use um template pronto e edite tudo do seu jeito.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-5 bg-gradient-brand text-white"><Plus className="mr-1.5 h-4 w-4" /> Criar nova página</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(pages ?? []).map((p) => (
          <article key={p.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand/50">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base font-bold leading-snug">{p.name}</h3>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", p.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground")}>
                {p.status === "published" ? "Publicada" : "Rascunho"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">/p/{p.slug}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {p.sections.length} {p.sections.length === 1 ? "seção" : "seções"} · atualizada {new Date(p.updated_at).toLocaleDateString("pt-BR")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link to="/criador-paginas/$id" params={{ id: p.id }}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Link></Button>
              {p.status === "published" && (
                <Button asChild size="sm" variant="outline"><a href={`/p/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir</a></Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setRenaming(p)}><Type className="mr-1 h-3.5 w-3.5" /> Renomear</Button>
              <Button size="sm" variant="outline" disabled={dup.isPending} onClick={() => dup.mutate(p.id)}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicar</Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(p)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir</Button>
            </div>
          </article>
        ))}
      </div>

      <NewPageDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => (refresh(), navigate({ to: "/criador-paginas/$id", params: { id } }))} />
      <RenameDialog page={renaming} onClose={() => setRenaming(null)} onDone={refresh} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta página?</AlertDialogTitle>
            <AlertDialogDescription>“{pendingDelete?.name}” será removida definitivamente e o link público deixará de funcionar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingDelete) del.mutate(pendingDelete.id); setPendingDelete(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameDialog({ page, onClose, onDone }: { page: SalesPage | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  useEffect(() => setName(page?.name ?? ""), [page]);
  const mut = useMutation({
    mutationFn: () => updatePage(page!.id, { name: name.trim() }),
    onSuccess: () => (toast.success("Nome atualizado."), onDone(), onClose()),
    onError: () => toast.error("Não foi possível renomear."),
  });
  return (
    <Dialog open={!!page} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Renomear página</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewPageDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [tpl, setTpl] = useState<string | null>(null);
  useEffect(() => { if (!open) { setName(""); setTpl(null); } }, [open]);
  const mut = useMutation({
    mutationFn: () => createPage(user!.id, name.trim(), tpl),
    onSuccess: (id) => (onOpenChange(false), toast.success("Página criada."), onCreated(id)),
    onError: () => toast.error("Não foi possível criar a página."),
  });
  const options = [{ key: null as string | null, name: "Começar do zero", emoji: "✨", description: "Página em branco para montar com a biblioteca de blocos." }, ...PAGE_TEMPLATES];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova página de venda</DialogTitle>
          <DialogDescription>Dê um nome e escolha como quer começar. Tudo continua 100% editável.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Nome da página</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Curso de Confeitaria" autoFocus />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.key ?? "blank"}
              type="button"
              onClick={() => setTpl(o.key)}
              className={cn("rounded-xl border p-4 text-left transition-colors", tpl === o.key ? "border-brand bg-brand/10" : "border-border hover:border-brand/50")}
            >
              <div className="text-2xl">{o.emoji}</div>
              <div className="mt-2 text-sm font-semibold">{o.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{o.description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate()} className="bg-gradient-brand text-white">
            {mut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Criar página
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
