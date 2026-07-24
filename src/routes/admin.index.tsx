import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Sparkles,
  Crown,
  Gem,
  Database,
  Clock,
  Activity,
  Check,
  Plus,
  Trash2,
  KeyRound,
  UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const STATS = [
  { label: "Clientes cadastrados", value: "—", icon: Users, hint: "Total geral" },
  { label: "Plano Starter", value: "—", icon: Sparkles, hint: "Ativos" },
  { label: "Plano PRO", value: "—", icon: Crown, hint: "Ativos" },
  { label: "Plano Plus", value: "—", icon: Gem, hint: "Ativos" },
  { label: "Ofertas mineradas", value: "—", icon: Database, hint: "Base atual" },
  { label: "Última mineração", value: "—", icon: Clock, hint: "Aguardando dados" },
];

const ACTIVITY = [
  { icon: Check, text: "Mineração executada", time: "há 2h" },
  { icon: Plus, text: "245 ofertas adicionadas", time: "há 2h" },
  { icon: Trash2, text: "18 ofertas removidas", time: "há 2h" },
  { icon: KeyRound, text: "Palavra-chave alterada", time: "ontem" },
  { icon: UserPlus, text: "Cliente PRO criado", time: "ontem" },
];

function AdminDashboard() {
  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Visão geral do painel administrativo."
        actions={
          <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Sistema Online
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
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
          <ol className="relative space-y-4 border-l border-border pl-5">
            {ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] grid h-4 w-4 place-items-center rounded-full border border-border bg-background">
                    <Icon className="h-2.5 w-2.5 text-brand" />
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{a.text}</span>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
