import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { summarizeProgress, useMiningProgress } from "@/components/mining-progress";
import {
  Users,
  Sparkles,
  Crown,
  Gem,
  Database,
  Clock,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [{ count: users }, roles, { count: offers }, lastRun] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("meta_offers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("meta_refresh_runs")
          .select("id, started_at, status, offers_upserted")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const roleCounts: Record<string, number> = { starter: 0, pro: 0, plus: 0, admin: 0 };
      (roles.data ?? []).forEach((r) => {
        const role = (r as { role: string }).role;
        roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      });

      return {
        users: users ?? 0,
        roleCounts,
        offers: offers ?? 0,
        lastRun: lastRun.data,
      };
    },
  });

  const activityQuery = useQuery({
    queryKey: ["admin", "recent_logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_logs")
        .select("id, action, created_at, kind")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const s = statsQuery.data;
  const runningNow = s?.lastRun?.status === "running";
  const progressQuery = useMiningProgress(s?.lastRun?.id, !!runningNow);
  const progress = progressQuery.data ?? null;
  const summary = progress ? summarizeProgress(progress) : null;
  const STATS = [
    { label: "Clientes cadastrados", value: s?.users ?? "—", icon: Users, hint: "Total geral" },
    { label: "Plano Starter", value: s?.roleCounts.starter ?? "—", icon: Sparkles, hint: "Ativos" },
    { label: "Plano PRO", value: s?.roleCounts.pro ?? "—", icon: Crown, hint: "Ativos" },
    { label: "Plano Plus", value: s?.roleCounts.plus ?? "—", icon: Gem, hint: "Ativos" },
    { label: "Ofertas ativas", value: s?.offers ?? "—", icon: Database, hint: "Base atual" },
    {
      label: "Última mineração",
      value: s?.lastRun
        ? new Date(s.lastRun.started_at).toLocaleString("pt-BR")
        : "—",
      icon: Clock,
      hint: s?.lastRun ? `${s.lastRun.offers_upserted} ofertas · ${s.lastRun.status}` : "Aguardando",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral do painel administrativo."
        actions={
          <Badge className="gap-1 bg-success/15 text-success hover:bg-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Sistema Online
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{stat.hint}</div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-brand" /> Últimas atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(activityQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividades registradas.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {(activityQuery.data ?? []).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[26px] grid h-4 w-4 place-items-center rounded-full border border-border bg-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">
                      {a.action}
                      {a.kind && (
                        <span className="ml-2 text-xs text-muted-foreground">· {a.kind}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
