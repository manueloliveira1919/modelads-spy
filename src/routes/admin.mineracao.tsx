import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQueryOptions } from "@/hooks/use-categories";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CategoryMetrics,
  HealthBadge,
  KeywordRanking,
  LiveLogs,
  MiningProgressPanel,
  fmtDuration,
  statusLabel,
  summarizeProgress,
  useMiningBreakdown,
  useMiningLogs,
  useMiningProgress,
  type MiningBreakdown,
  type MiningLogRow,
  type MiningProgressData,
} from "@/components/mining-progress";
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
  Pause,
  Ban,
  Download,
  Zap,
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
  return fmtDuration(new Date(endIso).getTime() - new Date(startIso).getTime());
}

function downloadFile(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function buildReportRows(
  run: RefreshRun,
  progress: MiningProgressData | null,
  breakdown: MiningBreakdown | null,
  logs: MiningLogRow[],
): string[][] {
  const s = progress ? summarizeProgress(progress, breakdown) : null;
  const rows: string[][] = [
    ["Seção", "Item", "Valor"],
    ["Execução", "Run", run.id],
    ["Execução", "Categoria", (s?.category as string) ?? "Todas"],
    ["Execução", "Status final", run.status],
    ["Execução", "Início", new Date(run.started_at).toLocaleString("pt-BR")],
    ["Execução", "Tempo total", formatDuration(run.started_at, run.finished_at)],
    ["Métricas", "Palavras processadas", String(s?.planSize ?? breakdown?.planned_terms?.length ?? 0)],
    ["Métricas", "Anúncios encontrados", String(progress?.ads_found ?? 0)],
    ["Métricas", "Páginas encontradas", String(breakdown?.pages_found ?? run.pages_seen)],
    ["Métricas", "Ofertas aprovadas", String(progress?.upserts ?? run.offers_upserted)],
    ["Métricas", "Ofertas descartadas", String(s?.discardedTotal ?? 0)],
    ["Métricas", "Taxa de aprovação", `${(s?.approvalRate ?? 0).toFixed(2)}%`],
    ["Jobs", "Concluídos", String(s?.done ?? 0)],
    ["Jobs", "Total", String(s?.total ?? 0)],
    ["Jobs", "Falhos", String(s?.failed ?? 0)],
  ];
  if (s) {
    rows.push(["Descartes", "Blacklist", String(s.discarded.blacklist)]);
    rows.push(["Descartes", "Idioma", String(s.discarded.language)]);
    rows.push(["Descartes", "Baixa relevância", String(s.discarded.low_relevance ?? 0)]);
    rows.push(["Descartes", "Sem categoria", String(s.discarded.category)]);
    rows.push(["Descartes", "Sem link/texto", String(s.discarded.no_text)]);
    rows.push(["Descartes", "Duplicadas", String(s.discarded.duplicate)]);
  }
  for (const c of breakdown?.categories ?? []) rows.push(["Categorias", c.category, String(c.ads)]);
  for (const k of (breakdown?.keywords ?? []).slice(0, 200))
    rows.push(["Palavras-chave", k.term, String(k.ads)]);
  if (run.error) rows.push(["Erros", "Run", run.error]);
  for (const l of logs.filter((l) => l.status !== "ok").slice(0, 50))
    rows.push(["Erros", new Date(l.created_at).toLocaleString("pt-BR"), l.summary ?? l.kind]);
  for (const l of logs.slice(0, 60))
    rows.push(["Logs", new Date(l.created_at).toLocaleString("pt-BR"), l.summary ?? l.kind]);
  return rows;
}

function MineracaoPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("__all__");
  const [paused, setPaused] = useState(false);
  const [detailRun, setDetailRun] = useState<RefreshRun | null>(null);
  const tickingRef = useRef(false);

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
    refetchInterval: 10_000,
  });

  const cronQuery = useQuery({
    queryKey: ["admin", "cron_status"],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)("mining_run_progress", { p_run_id: null });
      return data ?? null;
    },
    enabled: false,
  });
  void cronQuery;

  const categoriesQuery = useQuery({
    ...categoriesQueryOptions,
    select: (rows) => rows.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name })),
  });

  const last = runsQuery.data?.[0];
  const running = last?.status === "running";
  const details = (last?.details ?? {}) as {
    deactivated?: number;
    errors?: string[];
  };

  const pollMs = running ? 5_000 : false;
  const progressQuery = useMiningProgress(last?.id, pollMs);
  const breakdownQuery = useMiningBreakdown(last?.id, pollMs);
  const logsQuery = useMiningLogs(last?.id, pollMs);
  const progress = progressQuery.data ?? null;
  const breakdown = breakdownQuery.data ?? null;
  const logs = logsQuery.data ?? [];
  const summary = progress ? summarizeProgress(progress, breakdown) : null;
  const state = last
    ? statusLabel(last.status, progress?.phase ?? "search", {
        pending: summary?.pending ?? 0,
        running: summary?.running ?? 0,
        done: summary?.done ?? 0,
      })
    : null;

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin", "refresh_runs"] });
    qc.invalidateQueries({ queryKey: ["admin", "mining_progress"] });
    qc.invalidateQueries({ queryKey: ["admin", "mining_breakdown"] });
    qc.invalidateQueries({ queryKey: ["admin", "mining_logs"] });
  }, [qc]);

  /** Aciona um ciclo do worker. Retorna o atraso (ms) até o próximo ciclo. */
  const tickWorker = useCallback(async (): Promise<number> => {
    if (tickingRef.current) return 4_000;
    tickingRef.current = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return 15_000;
      const res = await fetch("/api/public/hooks/refresh-worker", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        processed?: number;
        results?: { error: string | null }[];
      };
      refreshAll();
      if (!res.ok || data.ok === false) return 15_000;
      if ((data.results ?? []).some((r) => r.error)) return 15_000;
      return (data.processed ?? 0) > 0 ? 10_000 : 4_000;
    } catch {
      return 15_000;
    } finally {
      tickingRef.current = false;
    }
  }, [refreshAll]);

  // Ciclo automático: mantém a run andando mesmo com os cron jobs desativados.
  useEffect(() => {
    if (!running || paused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loop = async () => {
      const delay = await tickWorker();
      if (!cancelled) timer = setTimeout(loop, delay);
    };
    void loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [running, paused, tickWorker]);

  const mineMut = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sua sessão expirou. Entre novamente para executar a mineração.");
      const res = await fetch("/api/public/hooks/refresh-offers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ category: category === "__all__" ? null : category }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; reason?: string };
      if (!res.ok || data.ok === false) {
        if (data.reason === "not_admin") throw new Error("Sua conta não tem permissão de administrador.");
        if (data.reason === "invalid_token") throw new Error("Sua sessão expirou. Entre novamente.");
        throw new Error(data.error ?? `Falha ao iniciar a mineração (HTTP ${res.status}).`);
      }
      return data;
    },
    onSuccess: async (data) => {
      setPaused(false);
      await logSystem({
        action: "mining.run",
        kind: "mining",
        metadata: data as Record<string, unknown>,
      });
      refreshAll();
      qc.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Mineração iniciada. Processando os lotes agora.");
      void tickWorker();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!last) return;
      const { error } = await (supabase.rpc as any)("mining_cancel_run", { p_run_id: last.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setPaused(false);
      refreshAll();
      toast.success("Execução cancelada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const exportCsv = () => {
    if (!last) return;
    const rows = buildReportRows(last, progress, breakdown, logs);
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    downloadFile(`mineracao-${last.id.slice(0, 8)}.csv`, "text/csv;charset=utf-8", `\uFEFF${csv}`);
  };

  const exportPdf = () => {
    if (!last) return;
    const rows = buildReportRows(last, progress, breakdown, logs);
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório de mineração ${last.id.slice(0, 8)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}
      h1{font-size:18px}table{border-collapse:collapse;width:100%;font-size:12px}
      td,th{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}</style></head>
      <body><h1>Relatório de mineração — ${last.id}</h1>
      <table><thead><tr>${rows[0].map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .slice(1)
        .map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>
      <script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para exportar em PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

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
    { label: "Páginas vistas", value: last ? String(last.pages_seen) : "—", icon: CheckCircle2 },
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
      label: "Taxa de aprovação",
      value: summary ? `${summary.approvalRate.toFixed(2)}%` : "—",
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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Minerar todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Minerar todas</SelectItem>
                {(categoriesQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    Apenas {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="gap-2"
              disabled={mineMut.isPending || running}
              onClick={() => mineMut.mutate()}
            >
              <Play className="h-4 w-4" />
              {mineMut.isPending || running ? "Executando..." : "Executar Mineração"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => void tickWorker()}>
              <Zap className="h-4 w-4" /> Processar fila agora
            </Button>
            {running && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setPaused((p) => !p)}>
                  <Pause className="h-4 w-4" /> {paused ? "Retomar" : "Pausar"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-rose-400"
                  disabled={cancelMut.isPending}
                  onClick={() => {
                    if (window.confirm("Cancelar a execução atual? Os jobs pendentes serão encerrados."))
                      cancelMut.mutate();
                  }}
                >
                  <Ban className="h-4 w-4" /> Cancelar
                </Button>
              </>
            )}
            <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!last}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportPdf} disabled={!last}>
              <Download className="h-4 w-4" /> PDF
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

      {last && summary && (
        <Card className="mb-6 border-brand/30 bg-brand/5">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="font-display font-bold">RUN #{last.id.slice(0, 8)}</span>
            <span>
              Status: <strong>{state?.label}</strong>
            </span>
            <span>Categoria: {summary.category ?? "Todas"}</span>
            <span>Palavras-chave: {summary.planSize ?? breakdown?.planned_terms?.length ?? "—"}</span>
            <span>
              Jobs: {summary.done}/{summary.total}
            </span>
            <span>Anúncios: {progress?.ads_found ?? 0}</span>
            <span>Aprovadas: {progress?.upserts ?? 0}</span>
            <span>Início: {new Date(last.started_at).toLocaleString("pt-BR")}</span>
            <span>Tempo: {summary.elapsed}</span>
            <span>ETA: {summary.eta}</span>
            <span>Velocidade: {summary.speed}</span>
            {running && <HealthBadge health={summary.health} />}
            {paused && <Badge className="bg-amber-500/15 text-amber-400">Pausado</Badge>}
          </CardContent>
        </Card>
      )}

      {running && state?.key === "waiting_worker" && summary && summary.idleMs > 5 * 60_000 && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              Nenhum job foi processado ainda. Os agendamentos automáticos podem estar desativados —
              use "Processar fila agora" para destravar.
            </span>
            <Button size="sm" onClick={() => void tickWorker()}>
              Processar fila agora
            </Button>
          </CardContent>
        </Card>
      )}

      {last && progress && (
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Progresso da execução</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="progresso">
              <TabsList className="mb-4">
                <TabsTrigger value="progresso">Progresso</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>
              <TabsContent value="progresso">
                <MiningProgressPanel progress={progress} breakdown={breakdown} />
              </TabsContent>
              <TabsContent value="categorias">
                {breakdown ? (
                  <CategoryMetrics breakdown={breakdown} />
                ) : (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                )}
              </TabsContent>
              <TabsContent value="keywords">
                {breakdown ? (
                  <KeywordRanking breakdown={breakdown} />
                ) : (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                )}
              </TabsContent>
              <TabsContent value="logs">
                <LiveLogs logs={logs} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

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
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de execuções</CardTitle>
          <Button variant="ghost" size="sm" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Ofertas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runsQuery.data ?? []).map((r) => {
                const sum = (r.details ?? {}) as {
                  summary?: { jobs?: { done?: number; total?: number } };
                };
                const jobs = sum.summary?.jobs;
                return (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setDetailRun(r)}
                  >
                    <TableCell className="text-muted-foreground">
                      {new Date(r.started_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{formatDuration(r.started_at, r.finished_at)}</TableCell>
                    <TableCell>
                      {jobs ? `${jobs.done ?? 0}/${jobs.total ?? 0}` : r.id === last?.id && summary ? `${summary.done}/${summary.total}` : "—"}
                    </TableCell>
                    <TableCell>{r.pages_seen}</TableCell>
                    <TableCell>{r.offers_upserted}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      <RunDetailDialog run={detailRun} onClose={() => setDetailRun(null)} />
    </div>
  );
}

function RunDetailDialog({ run, onClose }: { run: RefreshRun | null; onClose: () => void }) {
  const progressQuery = useMiningProgress(run?.id, false);
  const breakdownQuery = useMiningBreakdown(run?.id, false);
  const logsQuery = useMiningLogs(run?.id, false);
  const progress = progressQuery.data ?? null;
  const stored = (run?.details ?? {}) as { summary?: Partial<MiningBreakdown> };
  const breakdown =
    breakdownQuery.data && (breakdownQuery.data.categories?.length ?? 0) > 0
      ? breakdownQuery.data
      : ((stored.summary as MiningBreakdown | undefined) ?? breakdownQuery.data ?? null);
  const logs = logsQuery.data ?? [];
  const s = progress ? summarizeProgress(progress, breakdown) : null;

  return (
    <Dialog open={!!run} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle>Execução #{run?.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {run && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>Status final: <strong>{run.status}</strong></div>
              <div>Início: {new Date(run.started_at).toLocaleString("pt-BR")}</div>
              <div>Tempo total: {formatDuration(run.started_at, run.finished_at)}</div>
              <div>Categoria: {s?.category ?? "Todas"}</div>
              <div>Palavras processadas: {s?.planSize ?? breakdown?.planned_terms?.length ?? "—"}</div>
              <div>Anúncios encontrados: {progress?.ads_found ?? 0}</div>
              <div>Páginas encontradas: {breakdown?.pages_found ?? run.pages_seen}</div>
              <div>Ofertas aprovadas: {progress?.upserts ?? run.offers_upserted}</div>
              <div>Descartadas: {s?.discardedTotal ?? 0}</div>
              <div>Taxa de aprovação: {(s?.approvalRate ?? 0).toFixed(2)}%</div>
            </div>

            {run.error && <div className="text-rose-300">Erro: {run.error}</div>}

            {breakdown && (
              <div className="space-y-3">
                <h4 className="font-medium">Categorias</h4>
                <CategoryMetrics breakdown={breakdown} />
                <h4 className="font-medium">Palavras-chave</h4>
                <KeywordRanking breakdown={breakdown} />
              </div>
            )}

            <div>
              <h4 className="mb-2 font-medium">Linha do tempo</h4>
              <LiveLogs logs={logs} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
