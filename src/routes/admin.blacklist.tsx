import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  Download,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";

export const Route = createFileRoute("/admin/blacklist")({
  component: BlacklistPage,
});

type BlacklistRow = {
  id: string;
  word: string;
  category: string | null;
  kind: string | null;
  is_active: boolean;
  updated_at: string;
};

const CATS = [
  "Entretenimento",
  "Filmes",
  "Novelas",
  "Séries",
  "Política",
  "Notícias",
  "Esportes",
  "ONGs",
  "Marketplace",
  "Empregos",
  "Aplicativos",
  "Jogos",
];

const KINDS = ["exato", "contém", "regex"];

function BlacklistPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Partial<BlacklistRow> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rowsQuery = useQuery({
    queryKey: ["admin", "blacklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blacklist_words")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlacklistRow[];
    },
  });

  const rows = useMemo(() => {
    let list = rowsQuery.data ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => r.word.toLowerCase().includes(s));
    }
    if (category !== "all") list = list.filter((r) => r.category === category);
    return list;
  }, [rowsQuery.data, search, category]);

  const saveMut = useMutation({
    mutationFn: async (r: Partial<BlacklistRow>) => {
      if (r.id) {
        const { error } = await supabase
          .from("blacklist_words")
          .update({
            word: r.word,
            category: r.category,
            kind: r.kind,
            is_active: r.is_active ?? true,
          })
          .eq("id", r.id);
        if (error) throw error;
        await logSystem({ action: "blacklist.update", metadata: { word: r.word } });
      } else {
        const { error } = await supabase.from("blacklist_words").insert({
          word: r.word!,
          category: r.category ?? null,
          kind: r.kind ?? "contém",
          is_active: r.is_active ?? true,
        });
        if (error) throw error;
        await logSystem({ action: "blacklist.create", metadata: { word: r.word } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blacklist"] });
      setEditing(null);
      toast.success("Termo salvo");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blacklist_words").delete().eq("id", id);
      if (error) throw error;
      await logSystem({ action: "blacklist.delete", metadata: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blacklist"] });
      toast.success("Removido");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (r: BlacklistRow) => {
      const { error } = await supabase
        .from("blacklist_words")
        .update({ is_active: !r.is_active })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blacklist"] }),
  });

  async function importCsv(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    // formato: word,category,kind
    const items = lines.slice(lines[0].toLowerCase().startsWith("word") ? 1 : 0).map(
      (l) => {
        const [word, category, kind] = l.split(",").map((c) => c.trim());
        return { word, category: category || null, kind: kind || "contém", is_active: true };
      },
    ).filter((r) => r.word);
    if (!items.length) return toast.error("CSV vazio");
    const { error } = await supabase.from("blacklist_words").insert(items);
    if (error) return toast.error(error.message);
    await logSystem({ action: "blacklist.import", metadata: { count: items.length } });
    toast.success(`${items.length} importados`);
    qc.invalidateQueries({ queryKey: ["admin", "blacklist"] });
  }

  function exportCsv() {
    const list = rowsQuery.data ?? [];
    const csv =
      "word,category,kind,is_active\n" +
      list
        .map((r) =>
          [r.word, r.category ?? "", r.kind ?? "", r.is_active].join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blacklist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <AdminPageHeader
        title="Blacklist"
        description="Termos que devem ser excluídos da mineração."
        actions={
          <>
            <Button
              className="gap-2"
              onClick={() => setEditing({ word: "", category: CATS[0], kind: "contém", is_active: true })}
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar palavra..."
            className="pl-9 sm:w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {rows.length} termos
        </div>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Palavra</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última alteração</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!rowsQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum termo cadastrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.word}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.category ?? "—"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.kind ?? "—"}</TableCell>
                <TableCell>
                  {r.is_active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.updated_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(r)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleMut.mutate(r)}>
                        <Power className="mr-2 h-4 w-4" />
                        {r.is_active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Excluir "${r.word}"?`)) deleteMut.mutate(r.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar termo" : "Novo termo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Palavra</Label>
                <Input
                  value={editing.word ?? ""}
                  onChange={(e) => setEditing({ ...editing, word: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={editing.category ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={editing.kind ?? "contém"}
                  onValueChange={(v) => setEditing({ ...editing, kind: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editing?.word || saveMut.isPending}
              onClick={() => editing && saveMut.mutate(editing)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
