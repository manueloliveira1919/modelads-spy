import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles, Flame, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Escolha seu plano — Modelads" },
      { name: "description", content: "Compare os planos Starter e PRO do Modelads e desbloqueie todas as ferramentas de IA." },
      { property: "og:title", content: "Planos Modelads" },
      { property: "og:description", content: "Starter para minerar. PRO para modelar e criar com IA." },
    ],
  }),
  component: UpgradePage,
});

function UpgradePage() {
  const { isPro } = useAuth();

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

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 max-w-5xl mx-auto w-full">
          {/* STARTER */}
          <PlanCard
            name="Starter"
            price="89,90"
            headline="Ideal para quem deseja apenas minerar ofertas vencedoras da Biblioteca de Anúncios da Meta."
            features={[
              "Dashboard completo",
              "Ofertas do Dia",
              "Favoritos",
              "Atualizações constantes da mineração",
            ]}
            ctaLabel={isPro ? "Você está no plano PRO" : "Escolher Starter"}
            ctaDisabled={isPro}
            icon={Zap}
          />

          {/* PRO */}
          <PlanCard
            name="PRO"
            price="167,00"
            headline="Tudo do Starter + acesso completo às ferramentas de Inteligência Artificial do Modelads."
            features={[
              "🤖 Modela Spy AI",
              "📄 Modelador de Ofertas",
              "💬 Modelador de Funis WhatsApp",
              "❓ Modelador de Quiz",
              "🎨 Criador de Criativos",
              "🎙 Criador de Áudios",
              "🎥 Criador de VSL",
              "🧠 Novas ferramentas adicionadas constantemente",
            ]}
            ctaLabel={isPro ? "Plano atual" : "Quero ser PRO"}
            ctaDisabled={isPro}
            featured
            badge="🔥 MAIS COMPLETO"
            icon={Flame}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pagamento seguro. Em breve — checkout integrado.{" "}
          <Link to="/" className="underline hover:text-foreground">
            Voltar ao Dashboard
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

function PlanCard({
  name,
  price,
  headline,
  features,
  ctaLabel,
  ctaDisabled,
  featured,
  badge,
  icon: Icon,
}: {
  name: string;
  price: string;
  headline: string;
  features: string[];
  ctaLabel: string;
  ctaDisabled?: boolean;
  featured?: boolean;
  badge?: string;
  icon: typeof Zap;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 sm:p-8",
        featured
          ? "border-brand/60 bg-gradient-to-b from-brand/10 to-card shadow-2xl shadow-brand/10"
          : "border-border bg-card",
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-foreground shadow-lg">
          {badge}
        </div>
      )}
      <div
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl",
          featured ? "bg-brand text-brand-foreground" : "bg-muted text-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold">{name}</h2>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-xs text-muted-foreground">R$</span>
        <span className="font-display text-4xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{headline}</p>

      <ul className="mt-6 space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                featured ? "bg-brand/20 text-brand" : "bg-emerald-500/15 text-emerald-400",
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={ctaDisabled}
        className={cn(
          "mt-8 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition",
          featured
            ? "bg-brand text-brand-foreground shadow-lg shadow-brand/25 hover:brightness-110"
            : "border border-border bg-background text-foreground hover:bg-accent",
          ctaDisabled && "opacity-60 cursor-not-allowed",
        )}
      >
        {featured && !ctaDisabled && <Sparkles className="h-4 w-4" />}
        {ctaLabel}
      </button>
    </div>
  );
}
