import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Save, Trash2, History } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/utm")({
  head: () => ({
    meta: [
      { title: "Gerador de UTM — Modelads" },
      {
        name: "description",
        content: "Gere links com UTMs prontos para rastrear suas campanhas.",
      },
    ],
  }),
  component: Page,
});

const SOURCE_OPTIONS = [
  "facebook",
  "instagram",
  "whatsapp",
  "google",
  "youtube",
  "tiktok",
  "email",
  "linkedin",
];
const MEDIUM_OPTIONS = [
  "cpc",
  "social",
  "organico",
  "email",
  "referral",
  "display",
  "video",
  "influencer",
];

type Fields = {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

type HistoryItem = {
  id: string;
  url: string;
  finalUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  createdAt: string;
};

const EMPTY: Fields = {
  url: "",
  source: "facebook",
  medium: "cpc",
  campaign: "",
  content: "",
  term: "",
};

const STORAGE_KEY = "modelads:utm-history";

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function Page() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const finalUrl = useMemo(() => {
    if (!fields.url.trim()) return "";
    try {
      const base = fields.url.startsWith("http")
        ? fields.url
        : `https://${fields.url}`;
      const u = new URL(base);
      if (fields.source) u.searchParams.set("utm_source", fields.source);
      if (fields.medium) u.searchParams.set("utm_medium", fields.medium);
      if (fields.campaign) u.searchParams.set("utm_campaign", fields.campaign);
      if (fields.content) u.searchParams.set("utm_content", fields.content);
      if (fields.term) u.searchParams.set("utm_term", fields.term);
      return u.toString();
    } catch {
      return "";
    }
  }, [fields]);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function copy(text: string, id: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Link copiado");
    setTimeout(() => setCopied(null), 2000);
  }

  function save() {
    if (!finalUrl) {
      toast.error("Preencha ao menos a URL base");
      return;
    }
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      url: fields.url,
      finalUrl,
      source: fields.source,
      medium: fields.medium,
      campaign: fields.campaign,
      content: fields.content,
      term: fields.term,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...history].slice(0, 50);
    setHistory(next);
    saveHistory(next);
    toast.success("UTM salvo no histórico");
  }

  function remove(id: string) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(next);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Gerador de <span className="text-gradient-brand">UTM</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monte URLs rastreadas com UTMs em segundos. Ideal pra separar
            performance por campanha, criativo e público.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Field label="URL base" required>
              <input
                value={fields.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://seudominio.com/oferta"
                className="input"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="utm_source (origem)">
                <ComboInput
                  value={fields.source}
                  onChange={(v) => set("source", v)}
                  options={SOURCE_OPTIONS}
                  listId="utm-source-list"
                  placeholder="facebook"
                />
              </Field>
              <Field label="utm_medium (meio)">
                <ComboInput
                  value={fields.medium}
                  onChange={(v) => set("medium", v)}
                  options={MEDIUM_OPTIONS}
                  listId="utm-medium-list"
                  placeholder="cpc"
                />
              </Field>
            </div>
            <Field label="utm_campaign (campanha)">
              <input
                value={fields.campaign}
                onChange={(e) => set("campaign", e.target.value)}
                placeholder="lancamento-outubro"
                className="input"
              />
            </Field>
            <Field label="utm_content (nome do anúncio · opcional)">
              <input
                value={fields.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="criativo-vsl-01"
                className="input"
              />
            </Field>
            <Field label="utm_term (palavra-chave · opcional)">
              <input
                value={fields.term}
                onChange={(e) => set("term", e.target.value)}
                placeholder="emagrecer-rapido"
                className="input"
              />
            </Field>
            <style>{`
              .input {
                width: 100%;
                border-radius: 0.5rem;
                border: 1px solid var(--input);
                background: var(--background);
                padding: 0.625rem 0.75rem;
                font-size: 0.875rem;
                color: var(--foreground);
                outline: none;
              }
              .input::placeholder { color: var(--muted-foreground); }
              .input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 25%, transparent); }
            `}</style>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Link gerado
              </div>
              <div className="mt-3 min-h-[80px] break-all rounded-lg border border-border bg-background p-4 font-mono text-xs text-foreground/90">
                {finalUrl || (
                  <span className="text-muted-foreground">
                    Preencha a URL base para gerar seu link.
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => copy(finalUrl, "current")}
                  disabled={!finalUrl}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    finalUrl
                      ? copied === "current"
                        ? "bg-brand/20 text-brand"
                        : "bg-brand text-brand-foreground hover:opacity-90"
                      : "cursor-not-allowed bg-muted text-muted-foreground",
                  )}
                >
                  {copied === "current" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied === "current" ? "Copiado!" : "Copiar Link"}
                </button>
                <button
                  onClick={save}
                  disabled={!finalUrl}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    finalUrl
                      ? "border-border bg-background text-foreground hover:border-brand hover:text-brand"
                      : "cursor-not-allowed border-border bg-muted text-muted-foreground",
                  )}
                >
                  <Save className="h-4 w-4" />
                  Salvar
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border p-5 text-xs text-muted-foreground">
              Dica: mantenha um padrão de nomenclatura. Ex.:{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-foreground">
                lancamento-outubro
              </code>{" "}
              /{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-foreground">
                criativo-vsl-01
              </code>
              .
            </div>
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">
                Histórico de UTMs
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {history.length}
              </span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum UTM salvo ainda. Gere um link e clique em Salvar.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      {h.campaign && (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-brand">
                          {h.campaign}
                        </span>
                      )}
                      {h.source && (
                        <span className="text-muted-foreground">{h.source}</span>
                      )}
                      {h.medium && (
                        <span className="text-muted-foreground">· {h.medium}</span>
                      )}
                      <span className="text-muted-foreground/60">
                        · {new Date(h.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-foreground/80">
                      {h.finalUrl}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => copy(h.finalUrl, h.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        copied === h.id
                          ? "bg-brand/20 text-brand"
                          : "bg-secondary text-foreground hover:bg-accent",
                      )}
                    >
                      {copied === h.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied === h.id ? "Copiado!" : "Copiar"}
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-hot"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ComboInput({
  value,
  onChange,
  options,
  listId,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  listId: string;
  placeholder?: string;
}) {
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className="input"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-hot">*</span>}
      </span>
      {children}
    </label>
  );
}
