import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BLOCKED_WORDS } from "@/lib/mock-data";

export const Route = createFileRoute("/palavras-bloqueadas")({
  head: () => ({
    meta: [
      { title: "Detector de Palavras Bloqueadas — Modelads" },
      {
        name: "description",
        content:
          "Cole seu copy e veja quais palavras podem ser bloqueadas pela política de anúncios da Meta.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [text, setText] = useState("");

  const { matches, highlighted } = useMemo(() => {
    if (!text.trim()) return { matches: [] as string[], highlighted: null };
    const found = new Set<string>();
    // Escape regex specials in words
    const sorted = [...BLOCKED_WORDS].sort((a, b) => b.length - a.length);
    const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = text.split(regex);
    const nodes = parts.map((part, i) => {
      if (part && regex.test(part) && BLOCKED_WORDS.some((w) => w.toLowerCase() === part.toLowerCase())) {
        found.add(part.toLowerCase());
        return (
          <mark
            key={i}
            className="rounded bg-hot/25 px-1 py-0.5 font-semibold text-hot"
          >
            {part}
          </mark>
        );
      }
      return <span key={i}>{part}</span>;
    });
    // reset regex lastIndex isn't necessary because we split; but re-check via includes
    return {
      matches: Array.from(found),
      highlighted: nodes,
    };
  }, [text]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Detector de <span className="text-gradient-brand">Palavras Bloqueadas</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cole abaixo o texto do seu anúncio. Comparamos com termos que costumam ser
            reprovados pela política da Meta e destacamos o que precisa de atenção.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Texto do anúncio
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui seu copy..."
              className="min-h-[300px] w-full rounded-2xl border border-input bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <p className="text-xs text-muted-foreground">
              {text.length} caracteres · Lista com {BLOCKED_WORDS.length} termos monitorados
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Análise
            </label>
            <div className="min-h-[300px] rounded-2xl border border-border bg-card p-4">
              {!text.trim() ? (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="h-8 w-8" />
                  Aguardando texto para analisar
                </div>
              ) : matches.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm font-medium text-brand">
                    <ShieldCheck className="h-4 w-4" />
                    Nenhuma palavra bloqueada encontrada
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {text}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border border-hot/40 bg-hot/10 px-3 py-2 text-sm font-medium text-hot">
                    <ShieldAlert className="h-4 w-4" />
                    {matches.length} termo(s) potencialmente bloqueado(s)
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {highlighted}
                  </p>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Encontrados
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {matches.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 rounded-md bg-hot/15 px-2 py-1 text-xs font-medium text-hot"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
