import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Search, ListFilter, ChevronDown, Flame } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { OfferCard } from "@/components/offer-card";
import { listOffers } from "@/lib/offers.functions";
import { useActiveCategoryNames } from "@/hooks/use-categories";
import {
  LANGUAGES,
  PRODUCT_TYPES,
  STRUCTURES,
  type OfferCategory,
  type OfferLanguage,
  type OfferStructure,
  type ProductType,
} from "@/lib/offers-shape";
import { cn } from "@/lib/utils";

const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: () => listOffers(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/ofertas-do-dia")({
  head: () => ({
    meta: [
      { title: "Ofertas do Dia — Modelads" },
      {
        name: "description",
        content: "Ofertas já garimpadas e validadas na Meta Ad Library — nada em fase de teste.",
      },
      { property: "og:title", content: "Ofertas do Dia — Modelads" },
      { property: "og:description", content: "Ofertas já garimpadas e validadas." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(offersQuery);
  },
  component: Page,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Erro ao carregar ofertas: {error.message}
      </div>
    </AppShell>
  ),
});

type ScaleFilter = "escalando" | "todos" | "escaladissima";

function Page() {
  const [category, setCategory] = useState<OfferCategory | "todas">("todas");
  const [language, setLanguage] = useState<OfferLanguage | "todos">("todos");
  const [structure, setStructure] = useState<OfferStructure | "todas">("todas");
  const [productType, setProductType] = useState<ProductType | "todos">("todos");
  const [funnel, setFunnel] = useState<"todos" | "whatsapp">("todos");
  // Padrão exclui "testando" — aqui só aparecem ofertas já mineradas/validadas.
  const [scale, setScale] = useState<ScaleFilter>("escalando");
  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data } = useSuspenseQuery(offersQuery);
  const offers = data.offers;


  const activeFilterCount =
    (category !== "todas" ? 1 : 0) +
    (language !== "todos" ? 1 : 0) +
    (structure !== "todas" ? 1 : 0) +
    (productType !== "todos" ? 1 : 0) +
    (funnel !== "todos" ? 1 : 0) +
    (scale !== "escalando" ? 1 : 0);

  const filtered = useMemo(() => {
    const list = offers.filter((o) => {
      if (category === "todas" && o.category === "Sem categoria") return false;
      if (category !== "todas" && o.category !== category) return false;
      if (language !== "todos" && o.language !== language) return false;
      if (structure !== "todas" && o.structure !== structure) return false;
      if (productType !== "todos" && o.productType !== productType) return false;
      if (funnel === "whatsapp" && !o.isWhatsapp) return false;
      // "Ofertas do Dia" = só mineradas/validadas por padrão; nunca mostra "testando"
      // a menos que o usuário explicitamente escolha "Todos" no filtro de escala.
      if (scale === "escalando" && o.status === "testando") return false;
      if (scale === "escaladissima" && o.status !== "escaladissima") return false;
      if (query && !`${o.page} ${o.headline}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
    const rank = { escaladissima: 0, escalando: 1, crescendo: 2, testando: 3 } as const;
    return [...list].sort(
      (a, b) => rank[a.status] - rank[b.status] || b.activeAds - a.activeAds,
    );
  }, [offers, category, language, structure, productType, funnel, scale, query]);

  const escaladas = offers.filter((o) => o.status === "escaladissima").length;
  const crescendo = offers.filter((o) => o.status === "crescendo").length;
  const testando = offers.filter((o) => o.status === "testando").length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-hot" />
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Ofertas do <span className="text-gradient-brand">Dia</span>
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {offers.length} anúncios monitorados · {escaladas} escaladíssimas ·{" "}
              {crescendo} crescendo · {testando} testando
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar oferta ou página..."
                className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                filtersOpen || activeFilterCount > 0
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-foreground hover:border-accent",
              )}
            >
              <ListFilter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-brand px-1 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {data.error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {data.error}
          </div>
        )}

        {filtersOpen && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <FilterRow label="Status de Escala">
              <FilterChip active={scale === "escalando"} onClick={() => setScale("escalando")}>
                Crescendo + Escaladíssima
              </FilterChip>
              <FilterChip
                active={scale === "escaladissima"}
                onClick={() => setScale("escaladissima")}
              >
                Apenas Escaladíssima
              </FilterChip>
              <FilterChip active={scale === "todos"} onClick={() => setScale("todos")}>
                Todos (inclui testando)
              </FilterChip>
            </FilterRow>
            <FilterRow label="Categoria">
              <FilterChip active={category === "todas"} onClick={() => setCategory("todas")}>
                Todas
              </FilterChip>
              {CATEGORIES.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Idioma">
              <FilterChip active={language === "todos"} onClick={() => setLanguage("todos")}>
                Todos
              </FilterChip>
              {LANGUAGES.map((l) => (
                <FilterChip key={l} active={language === l} onClick={() => setLanguage(l)}>
                  {l}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Estrutura">
              <FilterChip active={structure === "todas"} onClick={() => setStructure("todas")}>
                Todas
              </FilterChip>
              {STRUCTURES.map((s) => (
                <FilterChip key={s} active={structure === s} onClick={() => setStructure(s)}>
                  {s}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Tipo de Produto">
              <FilterChip active={productType === "todos"} onClick={() => setProductType("todos")}>
                Todos
              </FilterChip>
              {PRODUCT_TYPES.map((p) => (
                <FilterChip key={p} active={productType === p} onClick={() => setProductType(p)}>
                  {p}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Funil">
              <FilterChip active={funnel === "todos"} onClick={() => setFunnel("todos")}>
                Todos
              </FilterChip>
              <FilterChip active={funnel === "whatsapp"} onClick={() => setFunnel("whatsapp")}>
                Funil WhatsApp
              </FilterChip>
            </FilterRow>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            {offers.length === 0
              ? "Nenhuma oferta no banco ainda. A primeira atualização vai popular a lista automaticamente."
              : "Nenhuma oferta encontrada com esses filtros."}
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
          ? "border-brand bg-gradient-brand"
          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
