import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Star, Wand2, Compass, Crown, Flame, TrendingUp, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { LandingPage } from "@/components/landing-page";
import { listOffers } from "@/lib/offers.functions";
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
  component: Home,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Erro ao carregar ofertas: {error.message}
      </div>
    </AppShell>
  ),
});

function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <LandingPage />;
  return <Dashboard />;
}

function useFavoritesCount() {

  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem("modelads:favorites") || "[]");
      setCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setCount(0);
    }
  }, []);
  return count;
}

function Dashboard() {
  const { data } = useSuspenseQuery(offersQuery);
  const offers = data.offers;
  const favCount = useFavoritesCount();
  const { user, isAdmin, isPro } = useAuth();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0];
  const planLabel = isAdmin ? "Admin" : isPro ? "Pro" : "Starter";

  const escaladas = offers.filter((o) => o.status === "escaladissima").length;
  const crescendo = offers.filter((o) => o.status === "crescendo").length;

  // Destaques: escaladíssima primeiro, depois crescendo, mais anúncios ativos primeiro.
  const rank = { escaladissima: 0, escalando: 1, crescendo: 2, testando: 3 } as const;
  const destaques = [...offers]
    .filter((o) => o.status !== "testando")
    .sort((a, b) => rank[a.status] - rank[b.status] || b.activeAds - a.activeAds)
    .slice(0, 5);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-gold">
            👋 Bom garimpo{displayName ? `, ${displayName}` : ""}.
          </h2>
          <p className="mt-1.5 font-mono text-sm text-muted-foreground">
            O banco tem <span className="font-semibold text-hot">{escaladas} escaladíssimas</span> e{" "}
            <span className="font-semibold text-warm">{crescendo} crescendo</span> agora mesmo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Star className="h-4 w-4" />} label="Favoritos" value={favCount} />
          <StatCard icon={<Wand2 className="h-4 w-4" />} label="Ferramentas usadas" value="Em breve" />
          <StatCard icon={<Compass className="h-4 w-4" />} label="Análises Spy AI" value="Em breve" />
          <StatCard icon={<Crown className="h-4 w-4" />} label="Plano atual" value={planLabel} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">🔥 Ofertas em destaque agora</h3>
            <Link
              to="/ofertas-do-dia"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {destaques.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma oferta minerada ainda. A mineração roda automaticamente.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {destaques.map((o) => (
                <Link
                  key={o.id}
                  to="/oferta/$id"
                  params={{ id: o.id }}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                    {o.status === "escaladissima" ? (
                      <Flame className="h-4 w-4 text-hot" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-warm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{o.page}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.category} · {o.activeAds} anúncios
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      o.status === "escaladissima"
                        ? "bg-hot/15 text-hot"
                        : "bg-warm/15 text-warm",
                    )}
                  >
                    {o.status === "escaladissima" ? "Escaladíssima" : "Crescendo"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-lg font-bold">✨ Recomendado pra você</h3>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Rode o Modela Spy AI na oferta que mais escalou essa semana.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>Veja a biblioteca completa e filtre por nicho em "Ofertas do Dia".</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="mt-2 truncate font-display text-lg font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
