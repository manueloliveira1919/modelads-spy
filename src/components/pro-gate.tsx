import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";

interface ProGateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export function ProGate({ title, description, icon: Icon, children }: ProGateProps) {
  const { isPro, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />
      </AppShell>
    );
  }

  if (isPro) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {children ?? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
              <p className="text-sm text-muted-foreground">
                Em construção — essa ferramenta está sendo preparada. Volte em breve.
              </p>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // Starter locked view
  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-card p-8 sm:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            <Lock className="h-3 w-3" />
            Recurso PRO
          </div>
          <div className="mt-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand/20 text-brand">
            <Icon className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            {description} Desbloqueie no plano PRO junto com todas as outras ferramentas de IA.
          </p>
          <Link
            to="/upgrade"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/25 hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" />
            Fazer upgrade para PRO
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
