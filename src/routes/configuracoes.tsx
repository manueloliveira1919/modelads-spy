import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, Bell, Palette, Shield } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Modelads" },
      { name: "description", content: "Personalize sua experiência no Modelads." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();

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
          <p className="text-sm text-muted-foreground">
            Faça login para acessar as configurações.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:brightness-110"
          >
            Entrar
          </Link>
        </div>
      </AppShell>
    );
  }

  const sections = [
    {
      icon: Bell,
      title: "Notificações",
      description: "Receba avisos quando novas ofertas vencedoras aparecerem.",
    },
    {
      icon: Palette,
      title: "Aparência",
      description: "Tema escuro por padrão. Em breve suporte a tema claro.",
    },
    {
      icon: Shield,
      title: "Privacidade",
      description: "Gerencie seus dados e preferências de privacidade.",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Personalize sua experiência no Modelads.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Em breve
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
