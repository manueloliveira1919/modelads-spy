import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OfferCard } from "@/components/offer-card";
import {
  CATEGORIES,
  LANGUAGES,
  OFFERS,
  STRUCTURES,
  type OfferCategory,
  type OfferLanguage,
  type OfferStructure,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Modelads — Espionagem de anúncios do Facebook" },
      {
        name: "description",
        content:
          "Encontre ofertas validadas na Meta Ads Library, descubra criativos escaladíssimos e modele o que funciona.",
      },
      { property: "og:title", content: "Modelads — Espionagem de anúncios" },
      {
        property: "og:description",
        content: "Ferramenta pra infoprodutores e afiliados brasileiros modelarem ofertas validadas.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [category, setCategory] = useState<OfferCategory | "todas">("todas");
  const [language, setLanguage] = useState<OfferLanguage | "todos">("todos");
  const [structure, setStructure] = useState<OfferStructure | "todas">("todas");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return OFFERS.filter((o) => {
      if (category !== "todas" && o.category !== category) return false;
      if (language !== "todos" && o.language !== language) return false;
      if (structure !== "todas" && o.structure !== structure) return false;
      if (query && !`${o.page} ${o.headline}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [category, language, structure, query]);

  const escaladas = OFFERS.filter((o) => o.status === "escaladissima").length;
  const crescendo = OFFERS.filter((o) => o.status === "crescendo").length;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Biblioteca de <span className="text-gradient-brand">ofertas</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {OFFERS.length} anúncios monitorados · {escaladas} escaladíssimas · {crescendo}{" "}
              crescendo
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar oferta ou página..."
              className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <FilterRow label="Categoria">
            <FilterChip active={category === "todas"} onClick={() => setCategory("todas")}>
              Todas
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Idioma">
            <FilterChip active={language === "todos"} onClick={() => setLanguage("todos")}>
              Todos
            </FilterChip>
            {LANGUAGES.map((l) => (
              <FilterChip
                key={l}
                active={language === l}
                onClick={() => setLanguage(l)}
              >
                {l}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Estrutura">
            <FilterChip active={structure === "todas"} onClick={() => setStructure("todas")}>
              Todas
            </FilterChip>
            {STRUCTURES.map((s) => (
              <FilterChip
                key={s}
                active={structure === s}
                onClick={() => setStructure(s)}
              >
                {s}
              </FilterChip>
            ))}
          </FilterRow>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhuma oferta encontrada com esses filtros.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
