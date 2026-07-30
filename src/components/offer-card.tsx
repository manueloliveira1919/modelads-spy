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
export const CATEGORY_STYLES: Record<OfferCategory, string> = {
  Info: "bg-[#3B82F6]/15 text-[#93BBFF] ring-1 ring-inset ring-[#3B82F6]/30",
  Nutra: "bg-[#3B82F6]/15 text-[#93BBFF] ring-1 ring-inset ring-[#3B82F6]/30",
  Relacionamento: "bg-[#EC4899]/15 text-[#F9A8D4] ring-1 ring-inset ring-[#EC4899]/30",
  "Finanças": "bg-[#FBBF24]/15 text-[#FCD34D] ring-1 ring-inset ring-[#FBBF24]/30",
  "Saúde": "bg-[#22C55E]/15 text-[#86EFAC] ring-1 ring-inset ring-[#22C55E]/30",
  Mentoria: "bg-[#8B5CF6]/15 text-[#C4B5FD] ring-1 ring-inset ring-[#8B5CF6]/30",
  "Aplicativo/App": "bg-[#1DB8FF]/15 text-[#7DD8FF] ring-1 ring-inset ring-[#1DB8FF]/30",
  "Sem categoria": "bg-secondary text-secondary-foreground",
};


export function OfferCard({ offer }: { offer: Offer }) {
  const { fav, toggle } = useFavorite(offer.id);
  const price = extractPrice(`${offer.headline} ${offer.description}`);

  return (
    <article className="group card-elevate relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm active:translate-y-0">
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

          {/* ESTATÍSTICAS — cada uma na sua caixinha, estilo destacado */}
          <div className="mt-auto grid grid-cols-3 gap-1.5">
            <MiniStatBox
              icon={<Clock className="h-3 w-3" />}
              label="dias"
              value={`${offer.activeDays}`}
            />
            <MiniStatBox
              icon={
                offer.status === "escaladissima" ? (
                  <Flame className="h-3 w-3 text-hot" />
                ) : offer.status === "crescendo" ? (
                  <TrendingUp className="h-3 w-3 text-warm" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )
              }
              label="anúncios"
              value={offer.activeAds}
            />
            <MiniStatBox
              icon={<Tag className="h-3 w-3" />}
              label="ticket"
              value={price ?? "—"}
              valueClassName={price ? "text-warm" : "text-muted-foreground"}
            />
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
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-3 text-sm font-semibold"
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

function MiniStatBox({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 py-1.5 text-center">
      <div className={cn("truncate font-display text-sm font-bold leading-none", valueClassName ?? "text-foreground")}>
        {value}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
    </div>
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

const LANG_FLAGS: Record<string, string> = {
  PT: "🇧🇷",
  ES: "🇪🇸",
  EN: "🇺🇸",
};

function LangBadge({ lang }: { lang: string }) {
  return (
    <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
      {LANG_FLAGS[lang] ?? ""} {lang}
    </span>
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
