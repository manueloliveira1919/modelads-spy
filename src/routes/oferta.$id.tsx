import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Globe,
  Image as ImageIcon,
  Languages,
  Layers,
  Library,
  Megaphone,
  MessageCircle,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, CategoryBadge } from "@/components/offer-card";
import { ShareOfferModal } from "@/components/share-offer-modal";
import { getOffer } from "@/lib/offers.functions";
import { extractPrice } from "@/lib/offer-heuristics";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LANG_FLAGS: Record<string, string> = {
  Português: "🇧🇷",
  Espanhol: "🇪🇸",
  Inglês: "🇺🇸",
};

const offerQuery = (id: string) =>
  queryOptions({
    queryKey: ["offer", id],
    queryFn: () => getOffer({ data: { id } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/oferta/$id")({
  loader: async ({ params, context }) => {
    const res = await context.queryClient.ensureQueryData(offerQuery(params.id));
    if (!res.offer) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Detalhes da oferta — Modelads" },
      {
        name: "description",
        content:
          "Veja criativo, copy, links, métricas de escala e análise por IA da oferta espionada na Biblioteca de Anúncios da Meta.",
      },
      { property: "og:title", content: "Detalhes da oferta — Modelads" },
      {
        property: "og:description",
        content:
          "Criativo, copy, links úteis e métricas de escala da oferta para você modelar com segurança.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfferDetail,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="py-20 text-center text-sm text-muted-foreground">
        Erro ao carregar oferta: {error.message}
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Oferta não encontrada.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          Voltar ao dashboard
        </Link>
      </div>
    </AppShell>
  ),
});

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback abaixo
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

function OfferDetail() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const { data } = useSuspenseQuery(offerQuery(params.id));
  const offer = data.offer!;
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const price = extractPrice(`${offer.headline} ${offer.description}`);
  const statusLabel =
    offer.status === "escaladissima"
      ? "Escaladíssima"
      : offer.status === "crescendo"
        ? "Crescendo"
        : "Testando";

  const publishedAt = new Date(Date.now() - offer.activeDays * 86_400_000);
  const publishedLabel = publishedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const longDescription = offer.description?.trim() || "Sem descrição disponível para este anúncio.";
  const isLong = longDescription.length > 420;

  async function downloadCreative() {
    if (!offer.creativeUrl) return;
    try {
      const res = await fetch(offer.creativeUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = offer.creativeType === "video" ? "mp4" : "jpg";
      a.download = `${offer.page.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Criativo baixado");
    } catch {
      toast.error("Não foi possível baixar o criativo");
    }
  }

  const fullOfferText = [
    `Oferta: ${offer.page}`,
    `Headline: ${offer.headline}`,
    "",
    `Descrição:\n${longDescription}`,
    "",
    `Nicho: ${offer.category}`,
    `Formato: ${offer.structure ?? "—"}`,
    `Ticket: ${price ?? "—"}`,
    `Dias rodando: ${offer.activeDays}`,
    `Anúncios ativos: ${offer.activeAds}`,
    `Idioma: ${offer.language}`,
    `Plataforma: Facebook / Meta Ads`,
    `Status: ${statusLabel}`,
    `Publicado em: ${publishedLabel}`,
    "",
    `Página do Facebook: ${offer.pageUrl}`,
    `Página de vendas: ${offer.linkUrl ?? "—"}`,
    `Biblioteca de anúncios: ${offer.adLibraryUrl ?? "—"}`,
    `Melhor criativo: ${offer.adSnapshotUrl ?? offer.creativeUrl ?? "—"}`,
  ].join("\n");

  async function copyFullOffer() {
    const ok = await copyText(fullOfferText);
    if (ok) toast.success("Oferta copiada com sucesso.");
    else toast.error("Não foi possível copiar. Verifique as permissões do navegador.");
  }

  return (
    <AppShell>
      <div className="animate-fade-in space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* ---------------- COLUNA ESQUERDA ---------------- */}
          <div className="space-y-6">
            <section className="card-elevate overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300">
              <div className="relative aspect-video bg-muted">
                {offer.creativeUrl ? (
                  offer.creativeType === "video" ? (
                    <video
                      src={offer.creativeUrl}
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={offer.creativeUrl}
                      alt={`Criativo do anúncio de ${offer.page}`}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-background p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      Mídia direta não disponível para este anúncio. Abra o original na Meta.
                    </p>
                    {offer.adSnapshotUrl && (
                      <a
                        href={offer.adSnapshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 text-xs font-semibold transition-opacity duration-200 hover:opacity-90"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver anúncio original
                      </a>
                    )}
                  </div>
                )}
                <div className="absolute left-4 top-4">
                  <StatusBadge status={offer.status} />
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Anunciante
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">
                    {offer.page}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">{offer.headline}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <CategoryBadge
                    category={offer.category}
                    withIcon
                    className="rounded-lg px-2.5 py-1 text-xs"
                  />

                  <span className="inline-flex items-center gap-1 rounded-lg bg-vsl/15 px-2.5 py-1 text-xs font-semibold text-vsl ring-1 ring-inset ring-vsl/30">
                    <Layers className="h-3 w-3" />
                    {offer.structure ?? "Formato n/d"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    {LANG_FLAGS[offer.language] ?? "🌐"} {offer.language}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold",
                      offer.status === "escaladissima" && "bg-hot/15 text-hot ring-1 ring-inset ring-hot/30",
                      offer.status === "crescendo" && "bg-warm/15 text-warm ring-1 ring-inset ring-warm/30",
                      offer.status === "testando" && "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {statusLabel}
                  </span>
                  {offer.isWhatsapp && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                      <MessageCircle className="h-3 w-3" />
                      Funil WhatsApp
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Descrição da oferta
                  </p>
                  <p
                    className={cn(
                      "mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90 transition-all duration-300",
                      !expanded && isLong && "line-clamp-6",
                    )}
                  >
                    {longDescription}
                  </p>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
                      >
                        {expanded ? "Ver menos" : "Ver mais"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={copyFullOffer}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 text-sm font-semibold shadow-lg shadow-brand/20 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Copiar oferta completa
                    </button>
                    {offer.creativeUrl && (
                      <button
                        type="button"
                        onClick={downloadCreative}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
                      >
                        <Download className="h-4 w-4" />
                        Baixar criativo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* LINKS ÚTEIS */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold">Links úteis</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tudo que você precisa para investigar essa oferta a fundo.
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <LinkCard
                  icon={<Facebook className="h-4 w-4" />}
                  href={offer.pageUrl}
                  title="Página do Facebook"
                  subtitle="Perfil do anunciante na Meta"
                />
                <LinkCard
                  icon={<Globe className="h-4 w-4" />}
                  href={offer.linkUrl}
                  title="Site do anunciante"
                  subtitle="Domínio de destino do anúncio"
                />
                <LinkCard
                  icon={<Sparkles className="h-4 w-4" />}
                  href={offer.adSnapshotUrl ?? offer.creativeUrl}
                  title="Melhor criativo"
                  subtitle="Prévia do anúncio original"
                />
                <LinkCard
                  icon={<Library className="h-4 w-4" />}
                  href={offer.adLibraryUrl}
                  title="Biblioteca de anúncios"
                  subtitle="Todos os anúncios ativos da página"
                />
                <LinkCard
                  icon={<Megaphone className="h-4 w-4" />}
                  href={offer.linkUrl}
                  title="Página de vendas"
                  subtitle="Abrir a landing page da oferta"
                  className="sm:col-span-2"
                />
              </div>

              {/* COMPARTILHAMENTO */}
              <div className="mt-5 border-t border-border pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-display text-sm font-semibold">Compartilhar oferta</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Envie os dados completos dessa oferta para o seu time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
                    style={{
                      background:
                        "linear-gradient(90deg, #3B82F6 0%, #6D7CFF 50%, #8B5CF6 100%)",
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar oferta
                  </button>
                </div>
              </div>
            </section>
          </div>


          {/* ---------------- COLUNA DIREITA ---------------- */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Informações da oferta</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <InfoCard icon={<Layers className="h-3.5 w-3.5" />} label="Formato" value={offer.structure ?? "—"} />
                <InfoCard icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Status" value={statusLabel} />
                <InfoCard
                  icon={<Languages className="h-3.5 w-3.5" />}
                  label="Idioma"
                  value={`${LANG_FLAGS[offer.language] ?? ""} ${offer.language}`}
                />
                <InfoCard icon={<Tag className="h-3.5 w-3.5" />} label="Nicho" value={offer.category} />
                <InfoCard icon={<Facebook className="h-3.5 w-3.5" />} label="Plataforma" value="Meta Ads" />
                <InfoCard icon={<BarChart3 className="h-3.5 w-3.5" />} label="Anúncios" value={offer.activeAds} />
                <InfoCard icon={<Clock className="h-3.5 w-3.5" />} label="Dias rodando" value={`${offer.activeDays}d`} />
                <InfoCard
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label="Ticket"
                  value={price ?? "—"}
                  valueClassName={price ? "text-warm" : undefined}
                />
                <InfoCard
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Publicado em"
                  value={publishedLabel}
                  className="col-span-2"
                />
              </div>
            </section>

            {/* MODELA SPY IA */}
            <section
              className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,108,248,.18), rgba(34,211,255,.12))",
                border: "1px solid rgba(34,211,255,.25)",
                boxShadow: "0 0 40px -18px rgba(79,141,255,.75)",
              }}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#4F8DFF]/25 blur-3xl" />
              <h2 className="font-display text-lg font-bold">⭐ Modela Spy IA</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                Analise automaticamente toda a estrutura da oferta, criativos, página de vendas,
                anúncios e estratégias utilizadas.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Usos restantes" value={isPro ? "Ilimitado" : "0"} />
                <MiniStat label="Plano" value={isPro ? "PRO ativo" : "PRO"} />
                <MiniStat label="Análise" value={isPro ? "Pronta" : "Bloqueada"} />
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: "/modela-spy-ai" })}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-sm font-semibold shadow-lg shadow-brand/25 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" />
                Analisar agora
              </button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-base font-semibold">Ações rápidas</h2>
              <div className="mt-3 space-y-2">
                <QuickCopy label="Copiar descrição" text={longDescription} icon={<Copy className="h-4 w-4" />} />
                <QuickCopy label="Copiar oferta completa" text={fullOfferText} icon={<ClipboardList className="h-4 w-4" />} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <ShareOfferModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        offer={{
          title: offer.page,
          category: offer.category,
          structure: offer.structure ?? "—",
          language: offer.language,
          ticket: price ?? "—",
          activeDays: offer.activeDays,
          activeAds: offer.activeAds,
          shareData: {
            imageUrl: offer.creativeType === "image" ? offer.creativeUrl : null,
            thumbnailUrl: offer.creativeUrl ?? null,
            pageUrl: offer.pageUrl ?? "—",
            advertiserUrl: offer.linkUrl ?? "—",
            libraryUrl: offer.adLibraryUrl ?? "—",
          },
        }}
      />

      {/* Modela Spy IA — botão fixo */}
      <button
        type="button"
        onClick={() => navigate({ to: "/modela-spy-ai" })}
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-brand px-5 text-sm font-semibold shadow-xl shadow-brand/30 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
      >
        <Sparkles className="h-4 w-4" />
        Modela Spy IA
      </button>
    </AppShell>

  );
}

function LinkCard({
  icon,
  href,
  title,
  subtitle,
  className,
}: {
  icon: React.ReactNode;
  href: string | null;
  title: string;
  subtitle: string;
  className?: string;
}) {
  if (!href) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3",
          className,
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground/70">Não disponível</p>
        </div>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-background hover:shadow-lg hover:shadow-brand/10",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand transition-colors duration-200 group-hover:bg-brand/20">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-brand" />
    </a>
  );
}

function InfoCard({
  icon,
  label,
  value,
  className,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/60 px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 truncate font-display text-sm font-bold", valueClassName)}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-background/40 px-2 py-2 text-center">
      <div className="truncate font-display text-xs font-bold">{value}</div>
      <div className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function QuickCopy({
  label,
  text,
  icon,
}: {
  label: string;
  text: string;
  icon: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!text) {
          toast.error("Nada para copiar (texto vazio).");
          return;
        }
        const ok = await copyText(text);
        if (ok) {
          setCopied(true);
          toast.success(
            label === "Copiar oferta completa" ? "Oferta copiada com sucesso." : "Copiado!",
          );
          setTimeout(() => setCopied(false), 1500);
        } else {
          toast.error("Não foi possível copiar. Verifique as permissões do navegador.");
        }
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
        copied ? "border-brand bg-brand/10 text-brand" : "border-border bg-background hover:border-accent",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      {copied ? <BadgeCheck className="h-4 w-4" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}
