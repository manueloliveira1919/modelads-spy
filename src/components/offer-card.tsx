import { Link } from "@tanstack/react-router";
import { Clock, Flame, TrendingUp, Layers } from "lucide-react";
import type { Offer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function OfferCard({ offer }: { offer: Offer }) {
  const hot = offer.status === "escaladissima";
  return (
    <Link
      to="/oferta/$id"
      params={{ id: offer.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={offer.creativeUrl}
          alt={offer.headline}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={offer.status} />
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            {offer.language}
          </span>
        </div>
        {offer.creativeType === "video" && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Vídeo
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="truncate font-display text-base font-semibold text-foreground">
            {offer.page}
          </h3>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{offer.headline}</p>

        <div className="flex flex-wrap gap-1.5">
          <Chip>{offer.category}</Chip>
          <Chip icon={<Layers className="h-3 w-3" />}>{offer.structure}</Chip>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {offer.activeDays}d ativo
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              hot ? "text-hot" : "text-warm",
            )}
          >
            {hot ? <Flame className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {offer.activeAds} anúncios
          </span>
        </div>
      </div>
    </Link>
  );
}

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
      {icon}
      {children}
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
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-warm px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warm-foreground">
      <TrendingUp className="h-3 w-3" />
      Crescendo
    </span>
  );
}
