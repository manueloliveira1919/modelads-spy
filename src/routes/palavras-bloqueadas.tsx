import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/palavras-bloqueadas")({
  head: () => ({
    meta: [
      { title: "Detector de Palavras Bloqueadas — Modelads" },
      {
        name: "description",
        content:
          "Cole seu copy e veja quais palavras podem causar reprovação de anúncios pela Meta.",
      },
    ],
  }),
  component: Page,
});

type Severity = "block" | "warn";

type Rule = {
  id: string;
  label: string;
  severity: Severity;
  // pattern deve ter flag `gi` e capturar o trecho a destacar
  pattern: RegExp;
  reason?: string;
};

// Escapa strings simples para regex
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Constrói regex "palavra inteira" com plural opcional e case-insensitive
const wordish = (term: string) =>
  new RegExp(`\\b${esc(term)}s?\\b`, "gi");

const RULES: Rule[] = [
  // === Bloqueios fortes ===
  { id: "cura", label: "cura / curar / cura garantida", severity: "block",
    pattern: /\b(cura(?:s|r|do|da|ndo)?(?:\s+garantida)?)\b/gi,
    reason: "Alegações de cura são proibidas pela Meta." },
  { id: "milagre", label: "milagroso / milagre", severity: "block",
    pattern: /\b(milagr(?:e|es|oso|osa|osos|osas))\b/gi,
    reason: "Promessas milagrosas são consideradas enganosas." },
  { id: "garantido", label: "garantido / garantia de resultado", severity: "block",
    pattern: /\b(garantid[oa]s?|garantia\s+(?:de\s+)?resultad[oa]s?)\b/gi,
    reason: "Garantias absolutas de resultado violam a política." },
  { id: "emagreca-kg", label: "emagreça X kg", severity: "block",
    pattern: /\bemagre[çc]a\s*\d+\s*(?:kg|quilos?)\b/gi,
    reason: "Promessas específicas de perda de peso são proibidas." },
  { id: "perca-kg", label: "perca X kg", severity: "block",
    pattern: /\bperc[ae]\s*\d+\s*(?:kg|quilos?)\b/gi,
    reason: "Promessas específicas de perda de peso são proibidas." },
  { id: "sem-esforco", label: "sem esforço", severity: "block",
    pattern: /\bsem\s+esfor[çc]o\b/gi,
    reason: "Sugere resultado sem trabalho — reprovada pela Meta." },
  { id: "100-eficaz", label: "100% eficaz / 100% garantido", severity: "block",
    pattern: /\b100\s*%\s*(?:eficaz|garantid[oa]|funcional|seguro)\b/gi,
    reason: "Promessas absolutas de eficácia são proibidas." },
  { id: "elimina", label: "elimina completamente", severity: "block",
    pattern: /\belimina(?:r)?\s+completamente\b/gi,
    reason: "Alegação absoluta de eliminação é reprovada." },
  { id: "aprovado-medicos", label: "aprovado por médicos", severity: "block",
    pattern: /\baprovad[oa]s?\s+por\s+m[ée]dicos?\b/gi,
    reason: "Sem comprovação, viola política de alegações de saúde." },
  { id: "ganhe-dinheiro", label: "ganhe dinheiro rápido", severity: "block",
    pattern: /\bganh[ea]\s+dinheiro\s+r[áa]pid[oa]\b/gi,
    reason: "Promessa de enriquecimento rápido é proibida." },
  { id: "fique-rico", label: "fique rico", severity: "block",
    pattern: /\bfique(?:m)?\s+ric[oa]s?\b/gi,
    reason: "Promessa de enriquecimento é reprovada." },

  // === Atenção ===
  { id: "clique-aqui", label: "clique aqui", severity: "warn",
    pattern: /\bclique\s+aqui\b/gi,
    reason: "Sozinho pode ser sinalizado como CTA de baixa qualidade." },
  { id: "antes-depois", label: "antes e depois", severity: "warn",
    pattern: /\bantes\s+e\s+depois\b/gi,
    reason: "Comparações de corpo/peso costumam ser reprovadas." },
];

type Hit = { start: number; end: number; ruleId: string; text: string };

function analyze(text: string): { hits: Hit[]; byRule: Map<string, Hit[]> } {
  const hits: Hit[] = [];
  for (const rule of RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      hits.push({ start: m.index, end: m.index + m[0].length, ruleId: rule.id, text: m[0] });
    }
  }
  // ordenar e remover sobreposições (mantém o primeiro de maior prioridade: block > warn)
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const filtered: Hit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start >= lastEnd) {
      filtered.push(h);
      lastEnd = h.end;
    } else {
      // sobreposto: prefere block sobre warn
      const prev = filtered[filtered.length - 1];
      const prevSev = RULES.find((r) => r.id === prev.ruleId)?.severity;
      const curSev = RULES.find((r) => r.id === h.ruleId)?.severity;
      if (prevSev === "warn" && curSev === "block") {
        filtered[filtered.length - 1] = h;
        lastEnd = h.end;
      }
    }
  }
  const byRule = new Map<string, Hit[]>();
  for (const h of filtered) {
    const arr = byRule.get(h.ruleId) ?? [];
    arr.push(h);
    byRule.set(h.ruleId, arr);
  }
  return { hits: filtered, byRule };
}

function renderHighlighted(text: string, hits: Hit[]) {
  if (hits.length === 0) return text;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    if (h.start > cursor) nodes.push(<span key={`t${i}`}>{text.slice(cursor, h.start)}</span>);
    const rule = RULES.find((r) => r.id === h.ruleId)!;
    nodes.push(
      <mark
        key={`h${i}`}
        title={rule.reason}
        className={cn(
          "rounded px-1 py-0.5 font-semibold",
          rule.severity === "block"
            ? "bg-hot/30 text-hot"
            : "bg-warm/30 text-warm",
        )}
      >
        {text.slice(h.start, h.end)}
      </mark>,
    );
    cursor = h.end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return nodes;
}

function Page() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const analysis = useMemo(
    () => (submitted ? analyze(submitted) : null),
    [submitted],
  );

  const blockCount = analysis
    ? [...analysis.byRule.entries()].filter(([id]) =>
        RULES.find((r) => r.id === id)?.severity === "block",
      ).length
    : 0;
  const warnCount = analysis
    ? [...analysis.byRule.entries()].filter(([id]) =>
        RULES.find((r) => r.id === id)?.severity === "warn",
      ).length
    : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Detector de <span className="text-gradient-brand">Palavras Bloqueadas</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cole o texto do seu anúncio, clique em <strong>Analisar</strong> e veja quais
            trechos têm histórico de reprovação pela política de anúncios da Meta.
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
              className="min-h-[320px] w-full rounded-2xl border border-input bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {text.length} caracteres · {RULES.length} regras monitoradas
              </p>
              <div className="flex gap-2">
                {submitted !== null && (
                  <button
                    onClick={() => {
                      setText("");
                      setSubmitted(null);
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setSubmitted(text)}
                  disabled={!text.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Search className="h-3.5 w-3.5" />
                  Analisar
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Análise
            </label>
            <div className="min-h-[320px] rounded-2xl border border-border bg-card p-4">
              {!analysis ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="h-8 w-8" />
                  Cole um texto e clique em <strong>Analisar</strong>.
                </div>
              ) : analysis.hits.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm font-medium text-brand">
                    <ShieldCheck className="h-4 w-4" />
                    Nenhum termo de risco encontrado
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {submitted}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {blockCount > 0 && (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-hot/40 bg-hot/10 px-3 py-2 text-sm font-medium text-hot">
                        <ShieldAlert className="h-4 w-4" />
                        {blockCount} termo(s) de bloqueio
                      </div>
                    )}
                    {warnCount > 0 && (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-warm/40 bg-warm/10 px-3 py-2 text-sm font-medium text-warm">
                        <AlertTriangle className="h-4 w-4" />
                        {warnCount} termo(s) de atenção
                      </div>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {renderHighlighted(submitted!, analysis.hits)}
                  </p>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {analysis.byRule.size} termos de risco encontrados
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {[...analysis.byRule.entries()].map(([id, hs]) => {
                        const rule = RULES.find((r) => r.id === id)!;
                        return (
                          <li
                            key={id}
                            className={cn(
                              "flex items-start justify-between gap-3 rounded-md border px-2.5 py-2 text-xs",
                              rule.severity === "block"
                                ? "border-hot/30 bg-hot/5"
                                : "border-warm/30 bg-warm/5",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {rule.severity === "block" ? (
                                  <ShieldAlert className="h-3.5 w-3.5 text-hot" />
                                ) : (
                                  <AlertTriangle className="h-3.5 w-3.5 text-warm" />
                                )}
                                <span className="font-semibold text-foreground">
                                  {rule.label}
                                </span>
                                <span className="text-muted-foreground">
                                  · {hs.length}x
                                </span>
                              </div>
                              {rule.reason && (
                                <p className="mt-1 text-muted-foreground">
                                  {rule.reason}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            Esses termos têm histórico de causar reprovação de anúncios pela Meta, mas a
            decisão final é sempre da própria plataforma. Use como orientação — não como
            garantia de aprovação.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
