import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
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

function Page() {
  const [fields, setFields] = useState({
    url: "",
    source: "facebook",
    medium: "cpc",
    campaign: "",
    content: "",
  });
  const [copied, setCopied] = useState(false);

  const finalUrl = useMemo(() => {
    if (!fields.url.trim()) return "";
    try {
      const base = fields.url.startsWith("http") ? fields.url : `https://${fields.url}`;
      const u = new URL(base);
      if (fields.source) u.searchParams.set("utm_source", fields.source);
      if (fields.medium) u.searchParams.set("utm_medium", fields.medium);
      if (fields.campaign) u.searchParams.set("utm_campaign", fields.campaign);
      if (fields.content) u.searchParams.set("utm_content", fields.content);
      return u.toString();
    } catch {
      return "";
    }
  }, [fields]);

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function copy() {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Gerador de <span className="text-gradient-brand">UTM</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monte URLs rastreadas com UTMs em segundos. Ideal pra separar performance por
            campanha, criativo e público.
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
                <input
                  value={fields.source}
                  onChange={(e) => set("source", e.target.value)}
                  placeholder="facebook"
                  className="input"
                />
              </Field>
              <Field label="utm_medium (meio)">
                <input
                  value={fields.medium}
                  onChange={(e) => set("medium", e.target.value)}
                  placeholder="cpc"
                  className="input"
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
            <Field label="utm_content (nome do anúncio)">
              <input
                value={fields.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="criativo-vsl-01"
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
              <button
                onClick={copy}
                disabled={!finalUrl}
                className={cn(
                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                  finalUrl
                    ? copied
                      ? "bg-brand/20 text-brand"
                      : "bg-brand text-brand-foreground hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground",
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </button>
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
      </div>
    </AppShell>
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
