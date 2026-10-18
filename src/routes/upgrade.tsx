import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles, Flame, Zap, Crown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/hooks/use-entitlements";
import { useEntitlements } from "@/hooks/use-entitlements";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Escolha seu plano — Modelads" },
      {
        name: "description",
        content: "Compare os planos Starter, Pro e Premium do Modelads e desbloqueie as ferramentas de IA.",
      },
      { property: "og:title", content: "Planos Modelads" },
      { property: "og:description", content: "Starter para minerar. Pro e Premium para modelar e criar com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpgradePage,
});

const FEATURE_LABELS: Record<string, string> = {
  dashboard: "Dashboard completo",
  ofertas_do_dia: "Ofertas do Dia",
  favoritos: "Favoritos",
  vitrine_ofertas: "Vitrine de ofertas",
  extensao_chrome: "Extensão Chrome",
  minha_conta: "Minha Conta",
  suporte: "Suporte",
  configuracoes: "Configurações",
  modelads_spy_ia: "ModelAds Spy IA",
  modelar_oferta: "Modelar Oferta",
  modelar_whatsapp: "Modelar Funil WhatsApp",
  modelar_quiz: "Modelar Quiz",
  criador_criativos: "Criador de Criativos",
  criador_audios: "Criador de Áudios",
  criador_vsl: "Criador de VSL",
  criador_paginas: "Criador de Páginas de Vendas",
};

const ICONS = { starter: Zap, pro: Flame, premium: Crown } as const;

function UpgradePage() {
  const { planCode } = useEntitlements();
  const plansQuery = usePlans();

  const featuresQuery = useQuery({
    queryKey: ["plan-features"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("plan_code, feature_key")
        .eq("enabled", true)
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      const map = new Map<string, string[]>();
      (data ?? []).forEach((f) => {
        const arr = map.get(f.plan_code) ?? [];
        arr.push(f.feature_key);
        map.set(f.plan_code, arr);
      });
      return map;
    },
  });

  const plans = plansQuery.data ?? [];

  return (
    <AppShell>
      <div className="space-y-10">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles className="h-3 w-3" />
            Planos Modelads
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
            Modele o que já <span className="text-gradient-brand">funciona</span>.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Escolha o plano ideal para acelerar suas campanhas. Cancele quando quiser.
          </p>
        </div>

        {!plansQuery.isLoading && plans.length === 0 && (
          <div className="mx-auto max-w-xl space-y-4 border border-border bg-card p-6 text-center rounded-lg" role="status">
            <h2 className="font-display text-xl font-bold">Ative seu plano Modelads</h2>
            <p className="text-sm text-muted-foreground">Starter para acessar as ofertas. Pro e Premium para as ferramentas de IA.</p>
            <p className="text-sm text-muted-foreground">Não foi possível carregar os preços e links de assinatura. Tente novamente.</p>
            <Button onClick={() => { void plansQuery.refetch(); void featuresQuery.refetch(); }}><Sparkles />Ver planos e assinar</Button>
          </div>
        )}
        {featuresQuery.isError && plans.length > 0 && (
          <div className="text-center text-sm text-muted-foreground" role="status">
            Não foi possível carregar a lista de recursos. <Button variant="link" onClick={() => { void featuresQuery.refetch(); }}>Tentar novamente</Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8 max-w-6xl mx-auto w-full">
          {plansQuery.isLoading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl border border-border bg-card/50" />
            ))}

          {plans.map((plan) => {
            const Icon = ICONS[plan.code as keyof typeof ICONS] ?? Zap;
            const comingSoon = plan.availability !== "available";
            const current = planCode === plan.code;
            const keys = featuresQuery.data?.get(plan.code) ?? [];
            return (
              <div
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 sm:p-8",
                  plan.code === "premium"
                    ? "border-gold/40 bg-gradient-to-b from-gold/10 to-card pro-shine"
                    : "border-border bg-card",
                )}
              >
                <div
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-xl",
                    plan.code === "premium" ? "bg-gradient-gold pro-shine" : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">{plan.name}</h2>
                <div className="mt-2 font-display text-3xl font-bold">
                  {plan.display_price ?? "Em breve"}
                </div>
                {plan.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.monthly_credits > 0
                    ? `${plan.monthly_credits} créditos de IA por mês`
                    : "Sem créditos de IA inclusos"}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {keys.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          plan.code === "premium" ? "bg-gold/20 text-gold" : "bg-success/15 text-success",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span>{FEATURE_LABELS[k] ?? k}</span>
                    </li>
                  ))}
                </ul>

                {!current && !comingSoon && plan.checkout_url?.startsWith("https://pay.cakto.com.br/") ? (
                  <Button asChild size="lg" className="mt-8 w-full"><a href={plan.checkout_url} target="_blank" rel="noopener noreferrer"><Sparkles />Assinar {plan.name}</a></Button>
                ) : (
                  <Button disabled variant="outline" size="lg" className="mt-8 w-full">{current ? "Plano atual" : "Em breve"}</Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro pela Cakto.{" "}
          <Link to="/" className="underline hover:text-foreground">
            Voltar ao Dashboard
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
