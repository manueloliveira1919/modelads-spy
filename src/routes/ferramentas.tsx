import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  Link2,
  ImageIcon,
  MessageCircle,
  Lightbulb,
  ArrowRight,
  Lock,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas — Modelads" },
      {
        name: "description",
        content:
          "Coleção de ferramentas Modelads para infoprodutores: compliance, tracking, IA e automação.",
      },
      { property: "og:title", content: "Ferramentas — Modelads" },
      {
        property: "og:description",
        content: "Ferramentas para acelerar suas campanhas de tráfego.",
      },
    ],
  }),
  component: Page,
});

type Category = "COMPLIANCE" | "TRACKING" | "IA-IMAGEM" | "AUTOMAÇÃO" | "VALIDAÇÃO";

type Tool = {
  category: Category;
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  soon?: boolean;
};

const TOOLS: Tool[] = [
  {
    category: "COMPLIANCE",
    title: "Detector de Palavras Bloqueadas",
    description:
      "Analise seu texto e detecte termos que causam reprovação em anúncios",
    icon: ShieldAlert,
    to: "/palavras-bloqueadas",
  },
  {
    category: "TRACKING",
    title: "Gerador de UTMs",
    description: "Crie links rastreáveis com UTMs para suas campanhas de tráfego",
    icon: Link2,
    to: "/utm",
  },
  {
    category: "IA-IMAGEM",
    title: "Gerador de Criativos",
    description: "Gere imagens e vídeos de anúncio automaticamente com IA",
    icon: ImageIcon,
    soon: true,
  },
  {
    category: "AUTOMAÇÃO",
    title: "Fluxo de WhatsApp",
    description: "Crie e exporte fluxos de automação para WhatsApp",
    icon: MessageCircle,
    soon: true,
  },
  {
    category: "VALIDAÇÃO",
    title: "Validador de Ideias",
    description: "Descubra se sua ideia de produto tem demanda antes de criar",
    icon: Lightbulb,
    soon: true,
  },
];

const CATEGORY_STYLES: Record<Category, string> = {
  COMPLIANCE: "bg-hot/15 text-hot",
  TRACKING: "bg-brand/15 text-brand",
  "IA-IMAGEM": "bg-warm/20 text-warm",
  AUTOMAÇÃO: "bg-warm/20 text-warm",
  VALIDAÇÃO: "bg-warm/20 text-warm",
};

function Page() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            <span className="text-gradient-brand">Ferramentas</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tudo o que você precisa pra criar, validar e escalar ofertas — num lugar só.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <ToolCard key={t.title} tool={t} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const badge = tool.soon ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-warm/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warm">
      <Lock className="h-3 w-3" />
      Em breve
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        CATEGORY_STYLES[tool.category],
      )}
    >
      {tool.category}
    </span>
  );

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6",
        tool.soon && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "grid h-12 w-12 place-items-center rounded-xl",
            tool.soon ? "bg-muted text-muted-foreground" : "bg-brand/15 text-brand",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        {badge}
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold">{tool.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>

      <div className="mt-5 pt-4 border-t border-border">
        {tool.soon ? (
          <button
            onClick={() =>
              toast.success("Beleza! A gente te avisa quando lançar.", {
                description: tool.title,
              })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-brand hover:text-brand transition-colors"
          >
            <BellRing className="h-3.5 w-3.5" />
            Quero ser avisado
          </button>
        ) : (
          <Link
            to={tool.to!}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2.5 transition-all"
          >
            Acessar
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
