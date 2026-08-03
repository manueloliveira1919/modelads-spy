import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  Search,
  Copy,
  Upload,
  Download,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";

type ParsedRow = { category: string; word: string };

function parseKeywordFile(text: string): { rows: ParsedRow[]; invalid: number } {
  const lines = text.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let invalid = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      invalid++;
      continue;
    }
    const [category, word] = parts;
    if (
      category.toLowerCase() === "categoria" &&
      word.toLowerCase() === "palavra"
    ) {
      continue;
    }
    rows.push({ category, word });
  }
  return { rows, invalid };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export const Route = createFileRoute("/admin/palavras-chave")({
  component: KeywordsPage,
});

type Keyword = {
  id: string;
  word: string;
  category: string | null;
  weight: number;
  is_active: boolean;
  updated_at: string;
};

function KeywordsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [order, setOrder] = useState<"recent" | "az" | "weight">("recent");
  const [editing, setEditing] = useState<Partial<Keyword> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [parsed, setParsed] = useState<{ rows: ParsedRow[]; invalid: number } | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);


  const kwQuery = useQuery({
    queryKey: ["admin", "search_keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_keywords")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Keyword[];
    },
  });

  const catQuery = useQuery({
    queryKey: ["admin", "keyword_categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("keyword_categories")
        .select("name")
        .order("name");
      return (data ?? []).map((c) => c.name as string);
    },
  });

  const rows = useMemo(() => {
    let list = kwQuery.data ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((k) => k.word.toLowerCase().includes(s));
    }
    if (category !== "all") list = list.filter((k) => k.category === category);
    if (status !== "all")
      list = list.filter((k) => (status === "active" ? k.is_active : !k.is_active));
    if (order === "az") list = [...list].sort((a, b) => a.word.localeCompare(b.word));
    else if (order === "weight") list = [...list].sort((a, b) => b.weight - a.weight);
    else list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [kwQuery.data, search, category, status, order]);

  const saveMut = useMutation({
    mutationFn: async (kw: Partial<Keyword>) => {
      if (kw.id) {
        const { error } = await supabase
          .from("search_keywords")
          .update({
            word: kw.word,
            category: kw.category,
            weight: kw.weight ?? 1,
            is_active: kw.is_active ?? true,
          })
          .eq("id", kw.id);
        if (error) throw error;
        await logSystem({ action: "keyword.update", metadata: { word: kw.word } });
      } else {
        const { error } = await supabase.from("search_keywords").insert({
          word: kw.word!,
          category: kw.category ?? null,
          weight: kw.weight ?? 1,
          is_active: kw.is_active ?? true,
        });
        if (error) throw error;
        await logSystem({ action: "keyword.create", metadata: { word: kw.word } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "search_keywords"] });
      setEditing(null);
      toast.success("Palavra salva");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("search_keywords").delete().eq("id", id);
      if (error) throw error;
      await logSystem({ action: "keyword.delete", metadata: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "search_keywords"] });
      toast.success("Removida");
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (kw: Keyword) => {
      const { error } = await supabase
        .from("search_keywords")
        .update({ is_active: !kw.is_active })
        .eq("id", kw.id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "search_keywords"] }),
  });

  const all = kwQuery.data ?? [];

  const stats = useMemo(() => {
    const byCategory = new Map<string, number>();
    let active = 0;
    let lastUpdate = "";
    for (const k of all) {
      const c = k.category ?? "Sem categoria";
      byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
      if (k.is_active) active++;
      if (k.updated_at > lastUpdate) lastUpdate = k.updated_at;
    }
    return {
      total: all.length,
      active,
      lastUpdate,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [all]);

  const existingKeys = useMemo(
    () =>
      new Set(
        all.map((k) => `${(k.category ?? "").toLowerCase()}|${k.word.toLowerCase()}`),
      ),
    [all],
  );

  const importSummary = useMemo(() => {
    if (!parsed) return null;
    const seen = new Set<string>();
    const toCreate: ParsedRow[] = [];
    let duplicates = 0;
    for (const r of parsed.rows) {
      const key = `${r.category.toLowerCase()}|${r.word.toLowerCase()}`;
      if (existingKeys.has(key) || seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      toCreate.push(r);
    }
    return { toCreate, duplicates, invalid: parsed.invalid, total: parsed.rows.length };
  }, [parsed, existingKeys]);

  const importMut = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      const known = new Set((catQuery.data ?? []).map((c) => c.toLowerCase()));
      const newCats = [
        ...new Set(
          rows
            .map((r) => r.category)
            .filter((c) => !known.has(c.toLowerCase())),
        ),
      ];
      if (newCats.length) {
        await supabase
          .from("keyword_categories")
          .insert(newCats.map((name) => ({ name, is_active: true })));
      }

      const size = 200;
      let created = 0;
      for (let i = 0; i < rows.length; i += size) {
        const chunk = rows.slice(i, i + size);
        const { error } = await supabase.from("search_keywords").insert(
          chunk.map((r) => ({
            word: r.word,
            category: r.category,
            weight: 1,
            is_active: true,
          })),
        );
        if (error) throw error;
        created += chunk.length;
        setImportProgress(Math.round((created / rows.length) * 100));
      }
      await logSystem({
        action: "keyword.import",
        metadata: { created, categories: newCats.length, file: importFileName },
      });
      return created;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["admin", "search_keywords"] });
      qc.invalidateQueries({ queryKey: ["admin", "keyword_categories"] });
      toast.success(
        `${created} palavras criadas · ${importSummary?.duplicates ?? 0} ignoradas`,
      );
      setImportOpen(false);
      setParsed(null);
      setImportFileName("");
      setImportProgress(null);
    },
    onError: (e) => {
      setImportProgress(null);
      toast.error((e as Error).message);
    },
  });

  function handleExport() {
    const list = category === "all" ? all : all.filter((k) => k.category === category);
    if (!list.length) {
      toast.error("Nada para exportar");
      return;
    }
    const csv = [
      "categoria,palavra",
      ...list.map(
        (k) => `${(k.category ?? "Sem categoria").replace(/,/g, " ")},${k.word.replace(/,/g, " ")}`,
      ),
    ].join("\n");
    const slug = category === "all" ? "todas" : category.toLowerCase().replace(/\s+/g, "-");
    downloadCsv(
      `palavras-chave-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
    void logSystem({
      action: "keyword.export",
      metadata: { category, total: list.length },
    });
  }

  return (
    <div>
      <AdminPageHeader
        title="Palavras-chave"
        description="Gerencie termos usados na mineração."
        actions={
          <>
            <Button
              className="gap-2 bg-gradient-brand"
              onClick={() =>
                setEditing({ word: "", category: catQuery.data?.[0] ?? "", weight: 1, is_active: true })
              }
            >
              <Plus className="h-4 w-4" /> Adicionar palavra-chave
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar CSV/TXT
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Palavras ativas
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-success">
            {stats.active}
          </div>
          <p className="text-xs text-muted-foreground">de {stats.total} no total</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Última atualização
          </div>
          <div className="mt-2 font-display text-lg font-bold">
            {stats.lastUpdate
              ? new Date(stats.lastUpdate).toLocaleString("pt-BR")
              : "—"}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Por categoria
          </div>
          <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {stats.byCategory.length === 0 && (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            {stats.byCategory.map(([name, count]) => (
              <Badge key={name} variant="secondary" className="gap-1">
                {name}
                <span className="font-bold text-brand">{count}</span>
              </Badge>
            ))}
          </div>
        </Card>
      </div>


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
            {(catQuery.data ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={order} onValueChange={(v) => setOrder(v as typeof order)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="az">A-Z</SelectItem>
            <SelectItem value="weight">Peso</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {rows.length} palavras
        </div>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Palavra</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última alteração</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {kwQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!kwQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma palavra cadastrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.word}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{k.category ?? "—"}</Badge>
                </TableCell>
                <TableCell>{k.weight}</TableCell>
                <TableCell>
                  {k.is_active ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/20">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(k.updated_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(k)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditing({
                            word: `${k.word} (cópia)`,
                            category: k.category,
                            weight: k.weight,
                            is_active: k.is_active,
                          })
                        }
                      >
                        <Copy className="mr-2 h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleMut.mutate(k)}>
                        <Power className="mr-2 h-4 w-4" />
                        {k.is_active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Excluir "${k.word}"?`)) deleteMut.mutate(k.id);
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
            <DialogTitle>{editing?.id ? "Editar palavra" : "Nova palavra"}</DialogTitle>
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
                    {(catQuery.data ?? []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Peso</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.weight ?? 1}
                  onChange={(e) =>
                    setEditing({ ...editing, weight: Number(e.target.value) || 1 })
                  }
                />
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
