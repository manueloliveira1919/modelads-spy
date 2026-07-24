import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, RefreshCw, Tags, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/mineracao")({
  component: MineracaoPage,
});

const METRICS = [
  { label: "Última execução", value: "—", icon: Clock },
  { label: "Tempo", value: "—", icon: Clock },
  { label: "Ofertas encontradas", value: "—", icon: CheckCircle2 },
  { label: "Ofertas aprovadas", value: "—", icon: CheckCircle2 },
  { label: "Ofertas descartadas", value: "—", icon: XCircle },
  { label: "Erros", value: "—", icon: AlertTriangle },
];

function MineracaoPage() {
  return (
    <div>
      <AdminPageHeader
        title="Mineração"
        description="Acompanhe e opere a mineração de anúncios."
        actions={
          <>
            <Button className="gap-2">
              <Play className="h-4 w-4" /> Executar Mineração
            </Button>
            <Button variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reclassificar
            </Button>
            <Button variant="outline" className="gap-2">
              <Tags className="h-4 w-4" /> Atualizar Categorias
            </Button>
          </>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
          Aguardando
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-border/60">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">{m.value}</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-brand">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Histórico de execuções</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum registro carregado. O histórico detalhado aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
