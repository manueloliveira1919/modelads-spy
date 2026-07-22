import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OfferCard } from "@/components/offer-card";
import { listOffers } from "@/lib/offers.functions";

const offersQuery = queryOptions({
  queryKey: ["offers"],
  queryFn: () => listOffers(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/ofertas-do-dia")({
  head: () => ({
    meta: [
      { title: "Ofertas do Dia — Modelads" },
      { name: "description", content: "As ofertas mais recentes descobertas hoje na Biblioteca de Anúncios da Meta." },
      { property: "og:title", content: "Ofertas do Dia — Modelads" },
      { property: "og:description", content: "Novas ofertas descobertas hoje." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(offersQuery);
  },
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(offersQuery);

  // "Do dia" = ativos há 1 dia ou menos. Fallback: até 3 dias se estiver vazio.
  const recent = data.offers.filter((o) => o.activeDays <= 1);
  const fallback = data.offers.filter((o) => o.activeDays <= 3);
  const list = recent.length > 0 ? recent : fallback;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-hot/15 text-hot">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Ofertas do <span className="text-gradient-brand">Dia</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.length} ofertas novas descobertas recentemente.
              {recent.length === 0 && list.length > 0 && " (últimos 3 dias)"}
            </p>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma oferta nova encontrada. A mineração roda diariamente — volte em algumas
              horas.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
