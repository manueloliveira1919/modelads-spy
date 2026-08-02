import { useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Library,
  Link2,
  MessageCircle,
  Send,
  Share2,
  Twitter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ShareData = {
  imageUrl: string | null;
  thumbnailUrl: string | null;
  pageUrl: string;
  advertiserUrl: string;
  libraryUrl: string;
};

export type ShareOffer = {
  title: string;
  category: string;
  structure: string;
  language: string;
  ticket: string;
  activeDays: number;
  activeAds: number;
  shareData: ShareData;
};

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ShareOfferModal({
  open,
  onOpenChange,
  offer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offer: ShareOffer;
}) {
  const [downloading, setDownloading] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : offer.shareData.pageUrl;

  const shareText = [
    `🔥 Oferta encontrada no Modelads: ${offer.title}`,
    "",
    `Nicho: ${offer.category}`,
    `Formato: ${offer.structure}`,
    `Idioma: ${offer.language}`,
    `Ticket: ${offer.ticket}`,
    `Dias rodando: ${offer.activeDays}`,
    `Anúncios ativos: ${offer.activeAds}`,
    "",
    `Facebook: ${offer.shareData.pageUrl}`,
    `Anunciante: ${offer.shareData.advertiserUrl}`,
    `Biblioteca: ${offer.shareData.libraryUrl}`,
  ].join("\n");

  const encoded = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const networks = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encoded}`,
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encoded}`,
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "X (Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encoded}`,
    },
  ];

  const image = offer.shareData.imageUrl ?? offer.shareData.thumbnailUrl;

  async function downloadImage() {
    if (!image) {
      toast.error("Imagem ainda não disponível para esta oferta.");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(image);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${offer.title.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada");
    } catch {
      toast.error("Não foi possível baixar a imagem");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Compartilhar oferta</DialogTitle>
          <DialogDescription>
            Envie essa oferta para o seu time ou salve os dados para modelar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Informações */}
          <div className="space-y-4">
            {image ? (
              <img
                src={image}
                alt={`Criativo da oferta ${offer.title}`}
                className="aspect-video w-full rounded-xl border border-border object-cover"
              />
            ) : (
              <div
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #6D7CFF 50%, #8B5CF6 100%)",
                }}
              >
                <Share2 className="h-7 w-7 text-white/90" />
                <p className="text-sm font-semibold text-white">
                  Imagem do anúncio disponível em breve.
                </p>
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Oferta</p>
              <h3 className="mt-1 font-display text-lg font-bold leading-snug">{offer.title}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Info label="Nicho" value={offer.category} />
              <Info label="Formato" value={offer.structure} />
              <Info label="Idioma" value={offer.language} />
              <Info label="Ticket" value={offer.ticket} />
              <Info label="Dias rodando" value={`${offer.activeDays}d`} />
              <Info label="Anúncios" value={String(offer.activeAds)} />
            </div>

            <div className="space-y-2">
              <ShareLink icon={<Facebook className="h-3.5 w-3.5" />} label="Página do Facebook" href={offer.shareData.pageUrl} />
              <ShareLink icon={<Link2 className="h-3.5 w-3.5" />} label="Site do anunciante" href={offer.shareData.advertiserUrl} />
              <ShareLink icon={<Library className="h-3.5 w-3.5" />} label="Biblioteca de anúncios" href={offer.shareData.libraryUrl} />
            </div>
          </div>

          {/* Compartilhamento */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Compartilhar em
            </p>
            <div className="grid grid-cols-2 gap-2">
              {networks.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-background"
                >
                  <n.icon className="h-4 w-4 text-brand" />
                  <span className="truncate">{n.label}</span>
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(shareUrl);
                if (ok) toast.success("Link copiado!");
                else toast.error("Não foi possível copiar o link.");
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
            >
              <Copy className="h-4 w-4" />
              Copiar link
            </button>

            <button
              type="button"
              onClick={downloadImage}
              disabled={downloading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-semibold shadow-lg shadow-brand/25 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Baixando…" : "Baixar imagem da oferta"}
            </button>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Em breve a imagem do anúncio será capturada automaticamente da Biblioteca de Anúncios
              da Meta e incluída no compartilhamento.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-display text-sm font-bold">{value}</div>
    </div>
  );
}

function ShareLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  const valid = href && href !== "—";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs",
        !valid && "border-dashed opacity-60",
      )}
    >
      <span className="text-brand">{icon}</span>
      <span className="shrink-0 font-semibold">{label}</span>
      {valid ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex min-w-0 items-center gap-1 truncate text-muted-foreground hover:text-brand"
        >
          <span className="truncate">{href}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <span className="ml-auto text-muted-foreground">Não disponível</span>
      )}
    </div>
  );
}
