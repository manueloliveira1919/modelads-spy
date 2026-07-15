import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  ExternalLink,
  Flame,
  Heart,
  ImageIcon,
  Layers,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/offer-card";
import { searchOffersLive, type LiveSearchResult } from "@/lib/search.functions";
import { extractPrice } from "@/lib/offer-heuristics";
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

type ScaleFilter = "escalando" | "todos" | "escaladissima";

function BuscarPage() {
  const [term, setTerm] = useState("");
  const [productType, setProductType] = useState<ProductType | "todos">("todos");
  const [funnel, setFunnel] = useState<"todos" | "whatsapp">("todos");
  const [scale, setScale] = useState<ScaleFilter>("escalando");
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

  const rawResults = mutation.data?.results ?? [];
  const results = useMemo(() => {
    const filtered = rawResults.filter((r) => {
      if (productType !== "todos" && r.productType !== productType) return false;
      if (funnel === "whatsapp" && !r.isWhatsapp) return false;
      if (scale === "escalando" && r.status === "testando") return false;
      if (scale === "escaladissima" && r.status !== "escaladissima") return false;
      return true;
    });
    const rank = { escaladissima: 0, crescendo: 1, testando: 2 } as const;
    return [...filtered].sort(
      (a, b) => rank[a.status] - rank[b.status] || b.activeAds - a.activeAds,
    );
  }, [rawResults, productType, funnel, scale]);

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

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo de Produto
          </span>
          <FilterChip
            active={productType === "todos"}
            onClick={() => setProductType("todos")}
          >
            Todos
          </FilterChip>
          {PRODUCT_TYPES.map((p) => (
            <FilterChip
              key={p}
              active={productType === p}
              onClick={() => setProductType(p)}
            >
              {p}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Funil
          </span>
          <FilterChip active={funnel === "todos"} onClick={() => setFunnel("todos")}>
            Todos
          </FilterChip>
          <FilterChip
            active={funnel === "whatsapp"}
            onClick={() => setFunnel("whatsapp")}
          >
            Funil WhatsApp
          </FilterChip>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status de Escala
          </span>
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
        </div>





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

const FAV_KEY = "modelads:favorites";

function LiveResultCard({ result }: { result: LiveSearchResult }) {
  const id = result.adArchiveId;
  const [fav, setFav] = useState(false);
  useEffect(() => {
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
      setFav(set.has(id));
    } catch {
      /* noop */
    }
  }, [id]);
  const toggleFav = () => {
    let set: Set<string>;
    try {
      set = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
    } catch {
      set = new Set();
    }
    if (set.has(id)) {
      set.delete(id);
      setFav(false);
      toast("Removido dos favoritos");
    } else {
      set.add(id);
      setFav(true);
      toast.success("Salvo nos favoritos");
    }
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  };
  const price = extractPrice(`${result.headline} ${result.description}`);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/20">
      {/* Cabeçalho compacto (sem imagem — busca ao vivo raramente traz mídia direta) */}
      <div className="relative flex h-20 items-center gap-2 border-b border-border bg-gradient-to-r from-muted/40 to-transparent px-4">
        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        <p className="truncate text-[11px] text-muted-foreground/70">
          Prévia disponível na Biblioteca de Anúncios
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <StatusBadge status={result.status} />
          <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            {result.language}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="truncate font-display text-lg font-bold leading-tight text-foreground">
            {result.page}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {result.headline}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">
            {result.productType}
          </span>
          {result.structure && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              <Layers className="h-3 w-3" />
              {result.structure}
            </span>
          )}
          {result.isWhatsapp && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
              <MessageCircle className="h-3 w-3" />
              WhatsApp
            </span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
          <MiniStat
            icon={<Clock className="h-3 w-3" />}
            label="Ativo"
            value={`${result.activeDays}d`}
          />
          <MiniStat
            icon={
              result.status === "escaladissima" ? (
                <Flame className="h-3 w-3 text-hot" />
              ) : result.status === "crescendo" ? (
                <TrendingUp className="h-3 w-3 text-warm" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )
            }
            label="Anúncios"
            value={result.activeAds}
            highlight
          />
          {price ? (
            <MiniStat
              icon={<Tag className="h-3 w-3 text-brand" />}
              label="Ticket"
              value={price}
            />
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/70 p-3">
        <button
          type="button"
          onClick={toggleFav}
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
            fav
              ? "border-pink-500/40 bg-pink-500/15 text-pink-400"
              : "border-border bg-background text-muted-foreground hover:border-accent hover:text-foreground",
          )}
        >
          <Heart className={cn("h-5 w-5", fav && "fill-current")} />
        </button>
        {result.adLibraryUrl ? (
          <a
            href={result.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Biblioteca
          </a>
        ) : (
          <span className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            Sem link
          </span>
        )}
      </div>
    </article>
  );
}

function MiniStat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate font-display font-bold leading-none text-foreground",
          highlight ? "text-xl" : "text-sm",
        )}
      >
        {value}
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
      type="button"
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

