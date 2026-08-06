import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES_QUERY_KEY, categoriesQueryOptions } from "@/hooks/use-categories";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, Power } from "lucide-react";

export const Route = createFileRoute("/admin/categorias")({
  component: CategoriasPage,
});

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
};

function CategoriasPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const catsQuery = useQuery(categoriesQueryOptions);

  const countsQuery = useQuery({
    queryKey: ["admin", "keyword_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("search_keywords").select("category");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        const c = (r as { category: string | null }).category ?? "—";
        map[c] = (map[c] ?? 0) + 1;
      });
      return map;
    },
  });

  // Após qualquer alteração, tudo que consome categorias é revalidado.
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    qc.invalidateQueries({ queryKey: ["admin", "keyword_counts"] });
    qc.invalidateQueries({ queryKey: ["admin", "search_keywords"] });
    qc.invalidateQueries({ queryKey: ["offers"] });
  };

  const saveMut = useMutation({
    mutationFn: async (c: Partial<Category>) => {
      const name = (c.name ?? "").trim();
      if (!name) throw new Error("Informe um nome para a categoria");
      if (c.id) {
        const previous = (catsQuery.data ?? []).find((x) => x.id === c.id);
        const { error } = await supabase
          .from("keyword_categories")
          .update({ name, color: c.color, icon: c.icon, is_active: c.is_active ?? true })
          .eq("id", c.id);
        if (error) throw error;
        // Renomeou? Leva junto palavras-chave e ofertas para não sobrar órfão.
        if (previous && previous.name !== name) {
          await supabase
            .from("search_keywords")
            .update({ category: name })
            .eq("category", previous.name);
          await supabase
            .from("meta_offers")
            .update({ category: name })
            .eq("category", previous.name);
        }
        await logSystem({ action: "category.update", metadata: { name } });
      } else {
        const { error } = await supabase.from("keyword_categories").insert({
          name,
          color: c.color ?? "#60a5fa",
          icon: c.icon ?? "Tag",
          is_active: c.is_active ?? true,
        });
        if (error) throw error;
        await logSystem({ action: "category.create", metadata: { name } });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setEditing(null);
      toast.success("Categoria salva");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMut = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase
        .from("keyword_categories")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keyword_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removida");
    },
    onError: (e) => toast.error((e as Error).message),
  });


  const rows = catsQuery.data ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Categorias"
        description="Configure categorias usadas para classificar as ofertas."
        actions={
          <Button
            className="gap-2"
            onClick={() => setEditing({ name: "", color: "#60a5fa", icon: "Tag", is_active: true })}
          >
            <Plus className="h-4 w-4" /> Criar categoria
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <Card key={c.id} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-lg"
                    style={{
                      backgroundColor: `${c.color ?? "#60a5fa"}20`,
                      color: c.color ?? "#60a5fa",
                    }}
                  >
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {countsQuery.data?.[c.name] ?? 0} palavras
                    </div>
                  </div>
                </div>
                {c.is_active ? (
                  <Badge className="bg-success/15 text-success hover:bg-success/20">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditing(c)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => toggleMut.mutate(c)}
                >
                  <Power className="h-3.5 w-3.5" />
                  {c.is_active ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => {
                    const n = countsQuery.data?.[c.name] ?? 0;
                    const msg = n
                      ? `Excluir "${c.name}"? ${n} palavra(s)-chave estão nesta categoria e ficarão sem categoria válida.`
                      : `Excluir "${c.name}"?`;
                    if (confirm(msg)) deleteMut.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!catsQuery.isLoading && rows.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cor (hex)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={editing.color ?? "#60a5fa"}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={editing.color ?? "#60a5fa"}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Ícone (nome lucide)</Label>
                <Input
                  value={editing.icon ?? "Tag"}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  placeholder="Tag, Heart, DollarSign..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editing?.name || saveMut.isPending}
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
