import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  ExternalLink,
  Flame,
  Layers,
  Loader2,
  Package,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/offer-card";
import { searchOffersLive, type LiveSearchResult } from "@/lib/search.functions";
import { PRODUCT_TYPES, type ProductType } from "@/lib/offers-shape";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Busca por Nicho — Modelads" },
      {
        name: "description",
        content:
          "Busque anúncios em tempo real na Meta Ad Library por palavra-chave, nicho ou anunciante.",
      },
    ],
  }),
  component: BuscarPage,
});

function BuscarPage() {
  const [term, setTerm] = useState("");
  const searchFn = useServerFn(searchOffersLive);
  const mutation = useMutation({
    mutationFn: (t: string) => searchFn({ data: { term: t } }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = term.trim();
    if (!t) return;
    mutation.mutate(t);
  }

  const results = mutation.data?.results ?? [];
  const searched = mutation.isSuccess || mutation.isError;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Busca por Nicho</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pesquise anúncios ativos ao vivo na Meta Ad Library (Brasil). Esses resultados
            são pontuais e não ficam salvos no dashboard.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-background px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Ex: receitas, chá emagrecedor, curso de inglês..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={120}
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending || !term.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Buscar
              </>
            )}
          </button>
        </form>

        {mutation.isPending && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            Consultando a Meta Ad Library ao vivo… pode levar alguns segundos.
          </div>
        )}

        {mutation.isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            Erro ao buscar: {(mutation.error as Error).message}
          </div>
        )}

        {mutation.isSuccess && mutation.data?.error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {mutation.data.error}
          </div>
        )}

        {searched && !mutation.isPending && results.length === 0 && !mutation.data?.error && (
          <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum anúncio encontrado para esse termo.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {results.length} anunciante{results.length === 1 ? "" : "s"} encontrado
              {results.length === 1 ? "" : "s"} para “{mutation.variables}”.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <LiveResultCard key={r.adArchiveId} result={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function LiveResultCard({ result }: { result: LiveSearchResult }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-accent">
      <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-muted to-background">
        <Sparkles className="h-8 w-8 text-muted-foreground/50" />
        <div className="absolute left-3 top-3">
          <StatusBadge status={result.status} />
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            BR
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <h3 className="truncate font-display text-base font-semibold text-foreground">
          {result.page}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{result.headline}</p>

        <div className="flex flex-wrap gap-1.5">
          {result.structure && (
            <Chip icon={<Layers className="h-3 w-3" />}>{result.structure}</Chip>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {result.activeDays}d ativo
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              result.status === "escaladissima" && "text-hot",
              result.status === "crescendo" && "text-warm",
              result.status === "testando" && "text-muted-foreground",
            )}
          >
            {result.status === "escaladissima" ? (
              <Flame className="h-3.5 w-3.5" />
            ) : result.status === "crescendo" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {result.activeAds} anúncios
          </span>
        </div>

        <div className="mt-auto flex gap-2 pt-2">
          {result.adSnapshotUrl && (
            <a
              href={result.adSnapshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:border-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver anúncio
            </a>
          )}
          {result.adLibraryUrl && (
            <a
              href={result.adLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:border-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Biblioteca
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
      {icon}
      {children}
    </span>
  );
}
