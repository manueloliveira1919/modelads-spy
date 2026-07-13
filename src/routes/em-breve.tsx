import { createFileRoute } from "@tanstack/react-router";
import { Lock, Sparkles, MessageCircle, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/em-breve")({
  head: () => ({
    meta: [
      { title: "Em Breve — Modelads" },
      { name: "description", content: "Próximas ferramentas da Modelads." },
    ],
  }),
  component: Page,
});

const UPCOMING = [
  {
    title: "Gerador de Criativos IA",
    description: "Gere imagens e vídeos de anúncio automaticamente a partir da sua oferta.",
    icon: Sparkles,
  },
  {
    title: "Fluxo de WhatsApp",
    description: "Crie e exporte fluxos de automação prontos para importar no WhatsApp.",
    icon: MessageCircle,
  },
  {
    title: "Validador de Ideias",
    description: "Descubra se sua ideia de produto tem demanda antes de criar a oferta.",
    icon: Lightbulb,
  },
];

function Page() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Em <span className="text-gradient-brand">Breve</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Novas ferramentas chegando pra fechar o ciclo completo do infoprodutor: da ideia
            à venda.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {UPCOMING.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
              >
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-warm/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warm">
                  <Lock className="h-3 w-3" />
                  Em breve
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/60 to-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
