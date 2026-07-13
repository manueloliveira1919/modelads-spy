import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar — Modelads" },
      {
        name: "description",
        content: "Busque anúncios e ofertas por palavra-chave, nicho ou anunciante.",
      },
    ],
  }),
  component: BuscarPage,
});

function BuscarPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Buscar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Encontre anúncios por palavra-chave, nicho ou anunciante.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ex: emagrecimento, renda extra, curso..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Em breve: integração com Meta Ad Library para busca em tempo real.
        </p>
      </div>
    </AppShell>
  );
}
