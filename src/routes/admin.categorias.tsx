import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

export const Route = createFileRoute("/admin/categorias")({
  component: CategoriasPage,
});

const CATS = [
  { name: "Info", color: "#60a5fa", icon: "Tag", count: 0 },
  { name: "Nutra", color: "#34d399", icon: "Leaf", count: 0 },
  { name: "Saúde", color: "#f472b6", icon: "Heart", count: 0 },
  { name: "Finanças", color: "#fbbf24", icon: "DollarSign", count: 0 },
  { name: "Relacionamento", color: "#f87171", icon: "Heart", count: 0 },
  { name: "Religião", color: "#a78bfa", icon: "BookOpen", count: 0 },
  { name: "Cursos", color: "#38bdf8", icon: "GraduationCap", count: 0 },
  { name: "Mentorias", color: "#fb923c", icon: "Users", count: 0 },
  { name: "Aplicativos", color: "#22d3ee", icon: "Smartphone", count: 0 },
];

function CategoriasPage() {
  return (
    <div>
      <AdminPageHeader
        title="Categorias"
        description="Configure categorias usadas para classificar as ofertas."
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Criar categoria
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATS.map((c) => (
          <Card key={c.name} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-lg"
                    style={{ backgroundColor: `${c.color}20`, color: c.color }}
                  >
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.count} palavras
                    </div>
                  </div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  Ativo
                </Badge>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
