import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { OfferCard } from "@/components/offer-card";
import { listOffers } from "@/lib/offers.functions";
import {
  CATEGORIES,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Modelads" },
      {
        name: "description",
        content:
          "Encontre ofertas validadas na Meta Ads Library, descubra criativos escaladíssimos e modele o que funciona.",
      },
      { property: "og:title", content: "Modelads" },
      {
        property: "og:description",
        content:
          "Encontre ofertas validadas na Meta Ads Library, descubra criativos escaladíssimos e modele o que funciona.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(offersQuery);
  },
  component: Dashboard,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Erro ao carregar ofertas: {error.message}
      </div>
    </AppShell>
  ),
});

function Dashboard() {
  const [category, setCategory] = useState<OfferCategory | "todas">("todas");
  const [language, setLanguage] = useState<OfferLanguage | "todos">("todos");
  const [structure, setStructure] = useState<OfferStructure | "todas">("todas");
  const [productType, setProductType] = useState<ProductType | "todos">("todos");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(offersQuery);
  const offers = data.offers;

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    const t = toast.loading("Atualizando ofertas da Meta Ad Library…");
    try {
      const res = await fetch("/api/public/hooks/refresh-offers", { method: "POST" });
      const json = (await res.json()) as {
        ok?: boolean;
        offers?: number;
        pages?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success(
        `Atualizado: ${json.offers ?? 0} anúncios / ${json.pages ?? 0} páginas`,
        { id: t },
      );
    } catch (err) {
      toast.error(`Falha ao atualizar: ${(err as Error).message}`, { id: t });
    } finally {
      setRefreshing(false);
    }
  }


  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (category !== "todas" && o.category !== category) return false;
      if (language !== "todos" && o.language !== language) return false;
      if (structure !== "todas" && o.structure !== structure) return false;
      if (productType !== "todos" && o.productType !== productType) return false;
      if (query && !`${o.page} ${o.headline}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [offers, category, language, structure, productType, query]);


  const escaladas = offers.filter((o) => o.status === "escaladissima").length;
  const crescendo = offers.filter((o) => o.status === "crescendo").length;
  const testando = offers.filter((o) => o.status === "testando").length;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Biblioteca de <span className="text-gradient-brand">ofertas</span>
            </h1>
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
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Atualizando…" : "Atualizar Ofertas"}
            </button>
          </div>
        </div>


        {data.error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {data.error}
          </div>
        )}

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
            <FilterChip
              active={structure === "todas"}
              onClick={() => setStructure("todas")}
            >
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
            {offers.length === 0
              ? "Nenhuma oferta no banco ainda. A primeira atualização vai popular o Dashboard automaticamente."
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
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
