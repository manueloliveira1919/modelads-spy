import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/qualidade")({
  component: QualidadePage,
});

type RefreshRun = {
  id: string;
  started_at: string;
  status: string;
  offers_upserted: number;
  pages_seen: number;
  details: Record<string, unknown> | null;
};

function QualidadePage() {
  const runsQuery = useQuery({
    queryKey: ["admin", "quality", "runs"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("meta_refresh_runs")
        .select("id, started_at, status, offers_upserted, pages_seen, details")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RefreshRun[];
    },
  });

  const offersQuery = useQuery({
    queryKey: ["admin", "quality", "offers"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("meta_offers")
        .select("id", { count: "exact", head: true });
      const { count: active } = await supabase
        .from("meta_offers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return { total: total ?? 0, active: active ?? 0 };
    },
  });

  const agg = useMemo(() => {
    const runs = runsQuery.data ?? [];
    let found = 0;
    let approved = 0;
    let noise = 0;
    let errors = 0;
    runs.forEach((r) => {
      const d = (r.details ?? {}) as {
        total_ads_collected?: number;
        skipped_noise?: number;
        errors?: string[];
      };
      found += d.total_ads_collected ?? 0;
      approved += r.offers_upserted;
      noise += d.skipped_noise ?? 0;
      errors += (d.errors?.length ?? 0);
    });
    const precision = found > 0 ? Math.round((approved / found) * 100) : 0;
    return { found, approved, noise, errors, precision, runs };
  }, [runsQuery.data]);

  const CARDS = [
    { label: "Total encontrado (30d)", value: agg.found.toLocaleString("pt-BR") },
    { label: "Aprovados (30d)", value: agg.approved.toLocaleString("pt-BR") },
    { label: "Rejeitados por blacklist/ruído", value: agg.noise.toLocaleString("pt-BR") },
    { label: "Ofertas ativas na base", value: (offersQuery.data?.active ?? 0).toLocaleString("pt-BR") },
    { label: "Total na base", value: (offersQuery.data?.total ?? 0).toLocaleString("pt-BR") },
    { label: "Erros de coleta (30d)", value: agg.errors.toLocaleString("pt-BR") },
    { label: "Taxa de precisão", value: `${agg.precision}%` },
  ];

  // 30-day mini chart data
  const chart = useMemo(() => {
    const byDay = new Map<string, { approved: number; found: number }>();
    (runsQuery.data ?? []).forEach((r) => {
      const day = r.started_at.slice(0, 10);
      const cur = byDay.get(day) ?? { approved: 0, found: 0 };
      const d = (r.details ?? {}) as { total_ads_collected?: number };
      cur.approved += r.offers_upserted;
      cur.found += d.total_ads_collected ?? 0;
      byDay.set(day, cur);
    });
    return Array.from(byDay.entries()).sort();
  }, [runsQuery.data]);

  const maxFound = Math.max(1, ...chart.map(([, v]) => v.found));

  return (
    <div>
      <AdminPageHeader
        title="Qualidade da Mineração"
        description="Acompanhe indicadores de qualidade das últimas execuções (30 dias)."
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
              <BarChart3 className="h-4 w-4 text-brand" /> Aprovados por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chart.length === 0 ? (
              <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Sem dados suficientes
              </div>
            ) : (
              <div className="flex h-56 items-end gap-1">
                {chart.map(([day, v]) => (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-brand/70"
                      style={{ height: `${(v.approved / maxFound) * 100}%` }}
                      title={`${day}: ${v.approved} aprovados / ${v.found} encontrados`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-brand" /> Histórico das execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {(runsQuery.data ?? []).slice(0, 15).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border-b border-border/40 pb-1.5 text-muted-foreground"
                >
                  <span>{new Date(r.started_at).toLocaleString("pt-BR")}</span>
                  <span className="text-foreground">
                    {r.offers_upserted} ofertas · {r.status}
                  </span>
                </li>
              ))}
              {!runsQuery.data?.length && (
                <li className="text-muted-foreground">Sem execuções registradas.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
