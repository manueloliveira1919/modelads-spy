import { Link } from "@tanstack/react-router";
import {
  Clock,
  ExternalLink,
  Flame,
  Heart,
  ImageIcon,
  Layers,
  MessageCircle,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { extractPrice } from "@/lib/offer-heuristics";
import type { Offer, OfferCategory } from "@/lib/offers-shape";
import { cn } from "@/lib/utils";

const FAV_KEY = "modelads:favorites";

function readFavs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function useFavorite(id: string) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(readFavs().has(id));
  }, [id]);
  const toggle = () => {
    const favs = readFavs();
    if (favs.has(id)) {
      favs.delete(id);
      setFav(false);
      toast("Removido dos favoritos");
    } else {
      favs.add(id);
      setFav(true);
      toast.success("Salvo nos favoritos");
    }
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  };
  return { fav, toggle };
}

// Paleta por categoria — cores sutis com boa legibilidade no dark mode.
const CATEGORY_STYLES: Record<OfferCategory, string> = {
  Info: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  Nutra: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  Relacionamento: "bg-pink-500/15 text-pink-300 ring-1 ring-inset ring-pink-500/30",
  "Finanças": "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  "Saúde": "bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-500/30",
  Mentoria: "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30",
  "Aplicativo/App": "bg-cyan-500/15 text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
  "Sem categoria": "bg-secondary text-secondary-foreground",
};

export function OfferCard({ offer }: { offer: Offer }) {
  const { fav, toggle } = useFavorite(offer.id);
  const price = extractPrice(`${offer.headline} ${offer.description}`);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/20 active:translate-y-0">
      <Link
        to="/oferta/$id"
        params={{ id: offer.id }}
        className="flex flex-1 flex-col"
      >
        {/* MÍDIA — compacta quando não há imagem real */}
        {offer.creativeUrl ? (
          <div className="relative aspect-video overflow-hidden bg-muted">
            <img
              src={offer.creativeUrl}
              alt={offer.headline}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <MediaBadges offer={offer} />
            {offer.creativeType === "video" && (
              <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Vídeo
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex h-20 items-center gap-2 border-b border-border bg-gradient-to-r from-muted/40 to-transparent px-4">
            <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <p className="truncate text-[11px] text-muted-foreground/70">
              Prévia disponível na Biblioteca de Anúncios
            </p>
            <div className="ml-auto flex items-center gap-1.5">
              <StatusBadge status={offer.status} />
              <LangBadge lang={offer.language} />
            </div>
          </div>
        )}

        {/* CORPO */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="truncate font-display text-lg font-bold leading-tight text-foreground">
              {offer.page}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {offer.headline}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                CATEGORY_STYLES[offer.category],
              )}
            >
              {offer.category}
            </span>
            {offer.structure && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                <Layers className="h-3 w-3" />
                {offer.structure}
              </span>
            )}
            {offer.isWhatsapp && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </span>
            )}
          </div>

          {/* ESTATÍSTICAS */}
          <div className="mt-auto grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/40 p-3">
            <Stat
              icon={<Clock className="h-3 w-3" />}
              label="Ativo"
              value={`${offer.activeDays}d`}
            />
            <Stat
              icon={
                offer.status === "escaladissima" ? (
                  <Flame className="h-3 w-3 text-hot" />
                ) : offer.status === "crescendo" ? (
                  <TrendingUp className="h-3 w-3 text-warm" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )
              }
              label="Anúncios"
              value={offer.activeAds}
              highlight
            />
            {price ? (
              <Stat
                icon={<Tag className="h-3 w-3 text-brand" />}
                label="Ticket"
                value={price}
              />
            ) : (
              <div />
            )}
          </div>
        </div>
      </Link>

      {/* RODAPÉ — botões fora do Link pra não aninhar <a> */}
      <div className="flex items-center gap-2 border-t border-border/70 p-3">
        <button
          type="button"
          onClick={toggle}
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
        {offer.adLibraryUrl ? (
          <a
            href={offer.adLibraryUrl}
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

function MediaBadges({ offer }: { offer: Offer }) {
  return (
    <>
      <div className="absolute left-3 top-3 flex gap-2">
        <StatusBadge status={offer.status} />
      </div>
      <div className="absolute right-3 top-3">
        <LangBadge lang={offer.language} />
      </div>
    </>
  );
}

function LangBadge({ lang }: { lang: string }) {
  return (
    <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
      {lang}
    </span>
  );
}

function Stat({
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

export function StatusBadge({ status }: { status: Offer["status"] }) {
  if (status === "escaladissima") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-hot px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-hot-foreground">
        <Flame className="h-3 w-3" />
        Escaladíssima
      </span>
    );
  }
  if (status === "crescendo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-warm px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
        <TrendingUp className="h-3 w-3" />
        Crescendo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-secondary-foreground">
      <Sparkles className="h-3 w-3" />
      Testando
    </span>
  );
}
