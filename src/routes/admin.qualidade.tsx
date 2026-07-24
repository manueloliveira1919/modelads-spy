import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/qualidade")({
  component: QualidadePage,
});

const CARDS = [
  { label: "Total encontrado", value: "—" },
  { label: "Aprovados", value: "—" },
  { label: "Rejeitados por blacklist", value: "—" },
  { label: "Rejeitados por idioma", value: "—" },
  { label: "Rejeitados por categoria", value: "—" },
  { label: "Duplicados", value: "—" },
  { label: "Taxa de precisão", value: "—%" },
];

function QualidadePage() {
  return (
    <div>
      <AdminPageHeader
        title="Qualidade da Mineração"
        description="Acompanhe indicadores de qualidade das últimas execuções."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" />
                <div className="font-display text-2xl font-bold">{c.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-brand" /> Aprovados vs Rejeitados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Gráfico em breve
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-brand" /> Evolução da precisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Gráfico em breve
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
