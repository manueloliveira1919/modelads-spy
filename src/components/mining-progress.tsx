import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MiningProgressData {
  run_id: string;
  status: string;
  phase: string;
  started_at: string;
  finished_at: string | null;
  details: Record<string, unknown> | null;
  pages_seen?: number;
  jobs: Record<string, { total: number; done: number; failed: number; pending: number }>;
  ads_found: number;
  upserts: number;
  offers_formed?: number;
  offers_qualified?: number;
  offers_rejected?: number;

  discarded: {
    blacklist: number;
    language: number;
    category: number;
    duplicate: number;
    no_text: number;
    low_relevance: number;
    entertainment?: number;
  };
}

export interface MiningBreakdown {
  run_id: string;
  categories: { category: string; ads: number }[];
  keywords: { term: string; ads: number }[];
  planned_terms: string[];
  pages_found: number;
  ads_raw: number;
  jobs: {
    total: number;
    done: number;
    failed: number;
    running: number;
    pending: number;
    last_finished_at: string | null;
  };
}

export interface MiningLogRow {
  id: string;
  kind: string;
  status: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** Etapas visíveis para o administrador. */
export const TIMELINE = [
  { key: "queued", label: "Criando jobs" },
  { key: "search", label: "Buscando anúncios" },
  { key: "classify", label: "Classificando ofertas" },
  { key: "blacklist", label: "Aplicando blacklist" },
  { key: "save", label: "Salvando ofertas" },
  { key: "finalize", label: "Finalizando" },
] as const;

const JOB_KIND_BY_PHASE: Record<string, string> = {
  search: "meta.search",
  snapshot: "snapshot.extract",
  classify: "classify.upsert",
  finalize: "run.finalize",
};

/** Índice da etapa atual na timeline, a partir da fase gravada na run. */
export function timelineIndex(phase: string): number {
  switch (phase) {
    case "search":
      return 1;
    case "snapshot":
      return 1;
    case "classify":
      return 2;
    case "finalize":
      return 5;
    case "done":
      return TIMELINE.length;
    default:
      return 0;
  }
}

export function useMiningProgress(runId: string | null | undefined, intervalMs: number | false) {
  return useQuery({
    queryKey: ["admin", "mining_progress", runId],
    enabled: !!runId,
    refetchInterval: intervalMs,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("mining_run_progress", {
        p_run_id: runId,
      });
      if (error) throw error;
      return (data ?? null) as MiningProgressData | null;
    },
  });
}

export function useMiningBreakdown(runId: string | null | undefined, intervalMs: number | false) {
  return useQuery({
    queryKey: ["admin", "mining_breakdown", runId],
    enabled: !!runId,
    refetchInterval: intervalMs,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("mining_run_breakdown", {
        p_run_id: runId,
      });
      if (error) throw error;
      return (data ?? null) as MiningBreakdown | null;
    },
  });
}

export function useMiningLogs(runId: string | null | undefined, intervalMs: number | false) {
  return useQuery({
    queryKey: ["admin", "mining_logs", runId],
    enabled: !!runId,
    refetchInterval: intervalMs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mining_logs")
        .select("*")
        .contains("details", { run_id: runId })
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data ?? []) as MiningLogRow[];
    },
  });
}

export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

export type MiningHealth = "healthy" | "slow" | "stuck";

export function summarizeProgress(p: MiningProgressData, b?: MiningBreakdown | null) {
  const jobs = p.jobs ?? {};
  let total = 0;
  let done = 0;
  let failed = 0;
  for (const k of Object.keys(jobs)) {
    total += jobs[k]?.total ?? 0;
    done += jobs[k]?.done ?? 0;
    failed += jobs[k]?.failed ?? 0;
  }
  const finished = done + failed;
  const running = b?.jobs?.running ?? 0;
  const pending = b?.jobs?.pending ?? Math.max(0, total - finished - running);

  const phaseIdx = timelineIndex(p.phase);
  const currentJobs = jobs[JOB_KIND_BY_PHASE[p.phase] ?? ""];
  const percent =
    total > 0 ? Math.min(100, Math.round((finished / total) * 100)) : p.phase === "done" ? 100 : 0;

  const endTs = p.finished_at ? new Date(p.finished_at).getTime() : Date.now();
  const elapsedMs = endTs - new Date(p.started_at).getTime();
  const remaining = total - finished;
  const etaMs = finished > 0 && remaining > 0 ? (elapsedMs / finished) * remaining : null;
  const speed = elapsedMs > 0 ? finished / (elapsedMs / 60000) : 0;

  const lastFinished = b?.jobs?.last_finished_at ? new Date(b.jobs.last_finished_at).getTime() : null;
  const idleMs = Date.now() - (lastFinished ?? new Date(p.started_at).getTime());
  const health: MiningHealth = idleMs > 30 * 60_000 ? "stuck" : idleMs > 15 * 60_000 ? "slow" : "healthy";

  const d = p.discarded ?? {
    blacklist: 0,
    language: 0,
    category: 0,
    duplicate: 0,
    no_text: 0,
    low_relevance: 0,
    entertainment: 0,
  };
  const discardedTotal =
    (d.blacklist ?? 0) +
    (d.language ?? 0) +
    (d.category ?? 0) +
    (d.duplicate ?? 0) +
    (d.no_text ?? 0) +
    (d.low_relevance ?? 0) +
    (d.entertainment ?? 0);

  const details = (p.details ?? {}) as {
    category?: string | null;
    plan_size?: number;
    coverage?: string;
    summary?: { ads_found?: number; pages_found?: number };
  };

  // Anúncios: progresso ao vivo → resumo congelado da run → 0.
  const adsFound = p.ads_found > 0 ? p.ads_found : (details.summary?.ads_found ?? 0);
  // Páginas: raw ao vivo → resumo congelado → coluna pages_seen da run.
  const pagesFound =
    (b?.pages_found ?? 0) > 0
      ? (b?.pages_found ?? 0)
      : (details.summary?.pages_found ?? p.pages_seen ?? 0);

  const approvalRate = adsFound > 0 ? (p.upserts / adsFound) * 100 : 0;

  return {
    total,
    done: finished,
    failed,
    running,
    pending,
    percent,
    phaseIdx,
    phaseLabel: p.phase === "done" ? "Concluída" : (TIMELINE[phaseIdx]?.label ?? "Preparando"),
    currentJobs,
    elapsed: fmtDuration(elapsedMs),
    eta: etaMs != null ? fmtDuration(etaMs) : "—",
    speed: speed > 0 ? `${speed.toFixed(1)} jobs/min` : "—",
    health,
    idleMs,
    discarded: d,
    discardedTotal,
    approvalRate,
    adsFound,
    category: details.category ?? "Todas",
    planSize: details.plan_size ?? null,
    pagesFound,
  };
}

/** Rótulo detalhado do estado da run (derivado de status + fase + fila). */
export function statusLabel(
  status: string,
  phase: string,
  opts: { pending: number; running: number; done: number },
): { key: string; label: string } {
  if (status !== "running") {
    const map: Record<string, string> = {
      success: "Concluída",
      partial: "Concluída com erros",
      blocked: "Bloqueada",
      failed: "Falhou",
      canceled: "Cancelada",
    };
    return { key: status, label: map[status] ?? status };
  }
  if (opts.running === 0 && opts.done === 0 && opts.pending > 0) {
    return { key: "waiting_worker", label: "Aguardando worker" };
  }
  if (phase === "classify") return { key: "classifying", label: "Classificando" };
  if (phase === "finalize") return { key: "finalizing", label: "Finalizando" };
  if (phase === "done") return { key: "saving", label: "Salvando ofertas" };
  return { key: "searching", label: "Buscando anúncios" };
}

export function HealthBadge({ health }: { health: MiningHealth }) {
  const map = {
    healthy: { label: "Saudável", cls: "bg-success/15 text-success" },
    slow: { label: "Lenta", cls: "bg-amber-500/15 text-amber-400" },
    stuck: { label: "Travada", cls: "bg-rose-500/15 text-rose-400" },
  } as const;
  const dot = { healthy: "bg-success", slow: "bg-amber-400", stuck: "bg-rose-400" } as const;
  return (
    <Badge className={cn("gap-1.5", map[health].cls)}>
      <span className={cn("h-2 w-2 rounded-full", dot[health])} />
      {map[health].label}
    </Badge>
  );
}

export function PhaseTimeline({ index }: { index: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIMELINE.map((step, i) => {
        const state = i < index ? "done" : i === index ? "current" : "todo";
        return (
          <div
            key={step.key}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              state === "current" && "border-brand/60 bg-brand/10 text-brand font-medium",
              state === "done" && "border-success/40 bg-success/10 text-success",
              state === "todo" && "border-border/60 text-muted-foreground",
            )}
          >
            <span>{state === "done" ? "✓" : state === "current" ? "•" : "○"}</span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

export function MiningProgressPanel({
  progress,
  breakdown,
}: {
  progress: MiningProgressData;
  breakdown?: MiningBreakdown | null;
}) {
  const s = summarizeProgress(progress, breakdown);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{s.phaseLabel}</span>
          {s.currentJobs && (
            <span className="text-sm text-muted-foreground">
              {s.currentJobs.done + s.currentJobs.failed}/{s.currentJobs.total} lotes
            </span>
          )}
          <Badge variant="secondary">{s.category ?? "Todas"}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Decorrido {s.elapsed} · Restante ~{s.eta} · {s.speed}
        </div>
      </div>

      <PhaseTimeline index={s.phaseIdx} />

      <Progress value={s.percent} />
      <div className="text-xs text-muted-foreground">
        {s.done} de {s.total} jobs concluídos ({s.percent}%)
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ofertas qualificadas" value={progress.offers_qualified ?? 0} />
        <Stat label="Ofertas formadas" value={progress.offers_formed ?? 0} />
        <Stat label="Ofertas rejeitadas" value={progress.offers_rejected ?? 0} />
        <Stat label="Anúncios classificados" value={progress.upserts} />
        <Stat label="Anúncios encontrados" value={s.adsFound} />
        <Stat label="Páginas analisadas" value={s.pagesFound} />
        <Stat label="Anúncios descartados" value={s.discardedTotal} />
        <Stat label="Jobs concluídos" value={s.done} />
        <Stat label="Jobs em execução" value={s.running} />
        <Stat label="Jobs pendentes" value={s.pending} />

        <Stat label="Jobs falhos" value={s.failed} />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>🚫 Blacklist: {s.discarded.blacklist}</span>
        <span>🌎 Idioma: {s.discarded.language}</span>
        <span>📉 Baixa relevância: {s.discarded.low_relevance ?? 0}</span>
        <span>🎬 Entretenimento: {s.discarded.entertainment ?? 0}</span>
        <span>❌ Sem categoria: {s.discarded.category}</span>
        <span>🔗 Sem link/texto: {s.discarded.no_text}</span>
        <span>🔁 Duplicadas: {s.discarded.duplicate}</span>
      </div>
    </div>
  );
}

export function CategoryMetrics({ breakdown }: { breakdown: MiningBreakdown }) {
  const rows = breakdown.categories ?? [];
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nenhum anúncio coletado ainda.</p>;
  }
  const max = Math.max(...rows.map((r) => r.ads), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.category} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm">{r.category}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(r.ads / max) * 100}%` }} />
          </div>
          <span className="w-20 text-right text-sm text-muted-foreground">{r.ads} anúncios</span>
        </div>
      ))}
    </div>
  );
}

export function KeywordRanking({ breakdown }: { breakdown: MiningBreakdown }) {
  const found = breakdown.keywords ?? [];
  const withAds = new Set(found.map((k) => k.term));
  const zero = (breakdown.planned_terms ?? []).filter((t) => t && !withAds.has(t));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-2 text-sm font-medium">Palavras-chave mais eficientes</h4>
        {found.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anúncio coletado ainda.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-auto pr-2">
            {found.slice(0, 50).map((k) => (
              <div key={k.term} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{k.term}</span>
                <span className="shrink-0 text-muted-foreground">{k.ads}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium">Sem resultados ({zero.length})</h4>
        {zero.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todas as palavras trouxeram anúncios.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-auto pr-2 text-sm text-muted-foreground">
            {zero.slice(0, 100).map((t) => (
              <div key={t} className="truncate">
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveLogs({ logs }: { logs: MiningLogRow[] }) {
  if (!logs.length) {
    return <p className="text-sm text-muted-foreground">Sem registros para esta execução.</p>;
  }
  return (
    <div className="max-h-80 space-y-1 overflow-auto font-mono text-xs">
      {logs.map((l) => (
        <div key={l.id} className="flex gap-3">
          <span className="shrink-0 text-muted-foreground">
            {new Date(l.created_at).toLocaleTimeString("pt-BR")}
          </span>
          <span
            className={cn(
              "shrink-0",
              l.status === "ok" || l.status === "success"
                ? "text-success"
                : l.status === "blocked" || l.status === "failed"
                  ? "text-rose-400"
                  : "text-muted-foreground",
            )}
          >
            {l.status}
          </span>
          <span className="truncate">{l.summary ?? l.kind}</span>
        </div>
      ))}
    </div>
  );
}
