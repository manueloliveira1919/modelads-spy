import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas — Modelads" },
      { name: "description", content: "Biblioteca completa de ofertas monitoradas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            <span className="text-gradient-brand">Ofertas</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Todas as ofertas monitoradas na Meta Ads Library aparecem no Dashboard.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
              <Megaphone className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold">
                Explorar biblioteca completa
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use os filtros do Dashboard pra encontrar ofertas por categoria, idioma
                e estrutura.
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5 transition-all"
              >
                Ir para o Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
