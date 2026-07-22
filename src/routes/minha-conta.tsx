import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { User, Mail, Shield, LogOut, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta — Modelads" },
      { name: "description", content: "Gerencie sua conta e assinatura Modelads." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, isPro, isAdmin, roles, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-muted text-muted-foreground">
            <User className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">Faça login para continuar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você precisa estar logado para acessar sua conta.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:brightness-110"
          >
            Entrar
          </Link>
        </div>
      </AppShell>
    );
  }

  const plan = isAdmin ? "Admin" : isPro ? "PRO" : "Starter";

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            <span className="text-gradient-brand">Minha Conta</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Suas informações de conta e assinatura.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Row icon={Mail} label="E-mail" value={user.email ?? "—"} />
          <Row
            icon={Shield}
            label="Plano atual"
            value={
              <span className={isPro ? "font-semibold text-brand" : "font-semibold"}>{plan}</span>
            }
          />
          <Row icon={User} label="ID" value={<code className="text-xs">{user.id.slice(0, 8)}…</code>} />
          {roles.length > 1 && (
            <Row icon={Shield} label="Papéis" value={roles.join(", ")} />
          )}
        </div>

        {!isPro && (
          <div className="rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/10 to-card p-6">
            <h3 className="font-display text-lg font-semibold">Desbloqueie o PRO</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse todas as ferramentas de IA por R$ 167,00/mês.
            </p>
            <Link
              to="/upgrade"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Fazer Upgrade
            </Link>
          </div>
        )}

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </AppShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
