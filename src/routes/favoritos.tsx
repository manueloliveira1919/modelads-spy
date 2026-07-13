import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Modelads" },
      { name: "description", content: "Suas ofertas favoritas para modelar." },
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
            <span className="text-gradient-brand">Favoritos</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Salve ofertas do Dashboard pra revisar depois.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="font-display text-lg font-semibold">Nada por aqui ainda</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Toque no coração de qualquer oferta pra guardar aqui. Em breve.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
