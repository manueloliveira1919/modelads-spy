import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface MiningProgressData {
  run_id: string;
  status: string;
  phase: string;
  started_at: string;
  finished_at: string | null;
  details: Record<string, unknown> | null;
  jobs: Record<string, { total: number; done: number; failed: number; pending: number }>;
  ads_found: number;
  upserts: number;
  discarded: {
    blacklist: number;
    language: number;
    category: number;
    duplicate: number;
    no_text: number;
    low_relevance: number;
  };
}

const PHASES: { key: string; label: string; jobKind: string | null }[] = [
  { key: "search", label: "Buscando anúncios", jobKind: "meta.search" },
  { key: "snapshot", label: "Preparando dados", jobKind: "snapshot.extract" },
  { key: "classify", label: "Classificando", jobKind: "classify.upsert" },
  { key: "finalize", label: "Salvando ofertas", jobKind: "run.finalize" },
];

export function useMiningProgress(runId: string | null | undefined, isRunning: boolean) {
  return useQuery({
    queryKey: ["admin", "mining_progress", runId],
    enabled: !!runId,
    refetchInterval: isRunning ? 5_000 : false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("mining_run_progress", {
        p_run_id: runId,
      });
      if (error) throw error;
      return (data ?? null) as MiningProgressData | null;
    },
  });
}

function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function summarizeProgress(p: MiningProgressData) {
  const jobs = p.jobs ?? {};
  let total = 0;
  let done = 0;
  for (const k of Object.keys(jobs)) {
    total += jobs[k]?.total ?? 0;
    done += (jobs[k]?.done ?? 0) + (jobs[k]?.failed ?? 0);
  }
  const phaseIdx = Math.max(0, PHASES.findIndex((f) => f.key === p.phase));
  const current = PHASES[phaseIdx] ?? PHASES[0];
  const currentJobs = current.jobKind ? jobs[current.jobKind] : undefined;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : p.phase === "done" ? 100 : 0;

  const elapsedMs = Date.now() - new Date(p.started_at).getTime();
  const remaining = total - done;
  const etaMs = done > 0 && remaining > 0 ? (elapsedMs / done) * remaining : null;

  const discarded = p.discarded ?? {
    blacklist: 0,
    language: 0,
    category: 0,
    duplicate: 0,
    no_text: 0,
    low_relevance: 0,
  };
  const discardedTotal =
    discarded.blacklist +
    discarded.language +
    discarded.category +
    discarded.duplicate +
    discarded.no_text +
    (discarded.low_relevance ?? 0);

  return {
    total,
    done,
    percent,
    phaseLabel: p.phase === "done" ? "Concluída" : current.label,
    currentJobs,
    elapsed: fmtDuration(elapsedMs),
    eta: etaMs != null ? fmtDuration(etaMs) : "—",
    discarded,
    discardedTotal,
    category: (p.details as { category?: string | null } | null)?.category ?? null,
  };
}

export function MiningProgressPanel({ progress }: { progress: MiningProgressData }) {
  const s = summarizeProgress(progress);
  const jobs = progress.jobs ?? {};

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
          {s.category && <Badge variant="secondary">{s.category}</Badge>}
        </div>
        <div className="text-sm text-muted-foreground">
          Decorrido {s.elapsed} · Restante ~{s.eta}
        </div>
      </div>

      <Progress value={s.percent} />
      <div className="text-xs text-muted-foreground">
        {s.done}/{s.total} tarefas concluídas ({s.percent}%)
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Anúncios encontrados" value={progress.ads_found} />
        <Stat label="Ofertas aprovadas" value={progress.upserts} />
        <Stat label="Descartados" value={s.discardedTotal} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Blacklist: {s.discarded.blacklist}</span>
        <span>Idioma: {s.discarded.language}</span>
        <span>Categoria: {s.discarded.category}</span>
        <span>Duplicados: {s.discarded.duplicate}</span>
        <span>Sem texto: {s.discarded.no_text}</span>
        <span>Baixa relevância: {s.discarded.low_relevance ?? 0}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {PHASES.filter((f) => jobs[f.jobKind ?? ""]).map((f) => {
          const j = jobs[f.jobKind as string];
          return (
            <span key={f.key}>
              {f.label}: {j.done + j.failed}/{j.total}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
