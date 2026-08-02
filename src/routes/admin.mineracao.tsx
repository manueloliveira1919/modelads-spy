import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  RefreshCw,
  Tags,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/mineracao")({
  component: MineracaoPage,
});

type RefreshRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  offers_upserted: number;
  pages_seen: number;
  error: string | null;
  details: Record<string, unknown> | null;
};

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function MineracaoPage() {
  const qc = useQueryClient();

  const runsQuery = useQuery({
    queryKey: ["admin", "refresh_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_refresh_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RefreshRun[];
    },
    refetchInterval: 15_000,
  });

  const last = runsQuery.data?.[0];
  const running = last?.status === "running";
  const details = (last?.details ?? {}) as {
    error_rate?: number;
    total_ads_collected?: number;
    deactivated?: number;
    errors?: string[];
  };

  const mineMut = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/public/hooks/refresh-offers", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async (data) => {
      await logSystem({
        action: "mining.run",
        kind: "mining",
        metadata: data as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: ["admin", "refresh_runs"] });
      qc.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Mineração concluída");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const METRICS = [
    {
      label: "Última execução",
      value: last ? new Date(last.started_at).toLocaleString("pt-BR") : "—",
      icon: Clock,
    },
    {
      label: "Duração",
      value: last ? formatDuration(last.started_at, last.finished_at) : "—",
      icon: Clock,
    },
    {
      label: "Páginas vistas",
      value: last ? String(last.pages_seen) : "—",
      icon: CheckCircle2,
    },
    {
      label: "Ofertas atualizadas",
      value: last ? String(last.offers_upserted) : "—",
      icon: CheckCircle2,
    },
    {
      label: "Desativadas",
      value: details.deactivated != null ? String(details.deactivated) : "—",
      icon: XCircle,
    },
    {
      label: "Erros",
      value:
        details.errors && Array.isArray(details.errors) ? String(details.errors.length) : "0",
      icon: AlertTriangle,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Mineração"
        description="Acompanhe e opere a mineração de anúncios."
        actions={
          <>
            <Button
              className="gap-2"
              disabled={mineMut.isPending || running}
              onClick={() => mineMut.mutate()}
            >
              <Play className="h-4 w-4" />
              {mineMut.isPending || running ? "Executando..." : "Executar Mineração"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["admin", "refresh_runs"] });
                qc.invalidateQueries({ queryKey: ["offers"] });
                toast.success("Reclassificado");
              }}
            >
              <RefreshCw className="h-4 w-4" /> Reclassificar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin", "categories"] })}
            >
              <Tags className="h-4 w-4" /> Atualizar Categorias
            </Button>
          </>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge
          className={
            running
              ? "bg-amber-500/15 text-amber-400"
              : last?.status === "success"
                ? "bg-emerald-500/15 text-emerald-400"
                : last?.status === "partial"
                  ? "bg-amber-500/15 text-amber-400"
                  : last?.status === "blocked"
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-muted text-muted-foreground"
          }
        >
          {running ? "Executando" : (last?.status ?? "Aguardando")}
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Ofertas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runsQuery.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.started_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{formatDuration(r.started_at, r.finished_at)}</TableCell>
                  <TableCell>{r.pages_seen}</TableCell>
                  <TableCell>{r.offers_upserted}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-rose-300">
                    {r.error ?? ""}
                  </TableCell>
                </TableRow>
              ))}
              {!runsQuery.isLoading && !runsQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma execução registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
