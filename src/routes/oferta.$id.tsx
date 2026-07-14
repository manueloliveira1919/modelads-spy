import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/offer-card";
import { getOffer } from "@/lib/offers.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    meta: [{ title: "Oferta — Modelads" }],
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

function OfferDetail() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(offerQuery(params.id));
  const offer = data.offer!;


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

  const statusLabel =
    offer.status === "escaladissima"
      ? "Escaladíssima"
      : offer.status === "crescendo"
        ? "Crescendo"
        : "Testando";
  const pageDataText = `Página: ${offer.page}
Categoria: ${offer.category}
Estrutura: ${offer.structure ?? "—"}
Idioma/País: ${offer.language}
Tempo ativo: ${offer.activeDays} dias
Anúncios ativos: ${offer.activeAds}
Status: ${statusLabel}`;


  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
                    alt={offer.headline}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-background p-6 text-center">
                  <ExternalLink className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Mídia direta não disponível para este anúncio. Abra o original na Meta.
                  </p>
                  {offer.adSnapshotUrl && (
                    <a
                      href={offer.adSnapshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
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

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Anunciante
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold">{offer.page}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag>{offer.category}</Tag>
                {offer.structure && (
                  <Tag icon={<Layers className="h-3 w-3" />}>{offer.structure}</Tag>
                )}
                <Tag>{offer.language}</Tag>
                <Tag icon={<Clock className="h-3 w-3" />}>{offer.activeDays}d ativo</Tag>
                <Tag>{offer.activeAds} anúncios</Tag>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Headline
                </p>
                <p className="mt-2 font-display text-lg font-semibold">{offer.headline}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descrição do anúncio
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                  {offer.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Ações rápidas</h2>
              <div className="mt-4 space-y-2">
                <ActionButton
                  icon={<FileText className="h-4 w-4" />}
                  label="Copiar descrição"
                  onCopy={() => offer.description}
                />
                {offer.creativeUrl && (
                  <button
                    onClick={downloadCreative}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:border-accent"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Baixar criativo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {offer.creativeType === "video" ? ".mp4" : ".jpg"}
                    </span>
                  </button>
                )}
                <ActionButton
                  icon={<Copy className="h-4 w-4" />}
                  label="Copiar dados da página"
                  onCopy={() => pageDataText}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Links externos</h2>
              <div className="mt-4 space-y-2">
                {offer.linkUrl ? (
                  <ExternalLinkRow
                    href={offer.linkUrl}
                    title="Ver página de destino"
                    subtitle="Abrir a landing page do anúncio"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                    Link de destino não disponível para este anúncio (a API pública da Meta nem sempre expõe esse campo).
                  </div>
                )}
                <ExternalLinkRow
                  href={offer.pageUrl}
                  title="Página do anunciante"
                  subtitle="Ver perfil no Facebook"
                />
                {offer.adSnapshotUrl && (
                  <ExternalLinkRow
                    href={offer.adSnapshotUrl}
                    title="Ver anúncio original"
                    subtitle="Abrir prévia do criativo na Meta"
                  />
                )}
                {offer.adLibraryUrl && (
                  <ExternalLinkRow
                    href={offer.adLibraryUrl}
                    title="Biblioteca de Anúncios"
                    subtitle="Ver todos os anúncios ativos"
                  />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {icon}
      {children}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  onCopy: () => string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(onCopy());
        setCopied(true);
        toast.success("Copiado para a área de transferência");
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
        copied
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-background hover:border-accent",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function ExternalLinkRow({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 hover:border-accent"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
