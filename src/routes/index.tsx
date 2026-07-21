import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Radar,
  ArrowRight,
  PlayCircle,
  Target,
  Trophy,
  FileSearch,
  Video,
  ClipboardList,
  Ticket,
  Package,
  Sparkles,
  FolderKanban,
  LayoutDashboard,
  Bot,
  MessageCircle,
  Wand2,
  ImageIcon,
  Clapperboard,
  Mic,
  Activity,
  BarChart3,
  Workflow,
  Check,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ModelAds Spy — Encontre ofertas vencedoras antes da concorrência" },
      {
        name: "description",
        content:
          "Inteligência de mineração da Biblioteca de Anúncios da Meta. Descubra criativos escalados, VSLs, quizzes e produtos vencedores antes de todo mundo.",
      },
      { property: "og:title", content: "ModelAds Spy — Encontre ofertas vencedoras antes da concorrência" },
      {
        property: "og:description",
        content:
          "Inteligência de mineração da Biblioteca de Anúncios da Meta. Descubra criativos escalados, VSLs, quizzes e produtos vencedores antes de todo mundo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CY = {
  bg: "#06141B",
  panel: "#0E2A35",
  mint: "#00F5A0",
  cyan: "#4BE3FF",
};

function Landing() {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden text-white antialiased"
      style={{ background: CY.bg }}
    >
      <BackgroundFX />
      <Nav />
      <Hero />
      <Benefits />
      <AISection />
      <Pricing />
      <Footer />
    </div>
  );
}

/* ---------- Background ---------- */
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(closest-side, ${CY.mint}, transparent 70%)` }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full blur-3xl opacity-25"
        style={{ background: `radial-gradient(closest-side, ${CY.cyan}, transparent 70%)` }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[420px] w-[900px] rounded-full blur-3xl opacity-20"
        style={{ background: `radial-gradient(closest-side, ${CY.mint}, transparent 70%)` }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(75,227,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(75,227,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
              boxShadow: `0 0 30px ${CY.mint}55`,
            }}
          >
            <Radar className="h-4.5 w-4.5 text-[#06141B]" strokeWidth={2.6} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            ModelAds<span style={{ color: CY.mint }}>Spy</span>
          </span>
        </a>
        <nav className="hidden gap-8 md:flex">
          {["Benefícios", "IA", "Planos"].map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase().replace("í", "i")}`}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {s}
            </a>
          ))}
        </nav>
        <Link
          to="/dashboard"
          className="group relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-[#06141B] transition-transform hover:scale-[1.03]"
          style={{
            background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
            boxShadow: `0 0 24px ${CY.mint}55`,
          }}
        >
          Entrar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section id="top" className="relative z-10">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pt-16">
        <div className="flex flex-col justify-center">
          <div
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur"
            style={{
              borderColor: `${CY.cyan}33`,
              background: `${CY.cyan}0d`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CY.mint, boxShadow: `0 0 12px ${CY.mint}` }}
            />
            Inteligência de anúncios em tempo real
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            O sistema que encontra{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
              }}
            >
              ofertas vencedoras
            </span>{" "}
            antes da concorrência.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            O ModelAds Spy usa inteligência para minerar anúncios escalados da
            Biblioteca de Anúncios da Meta. Descubra criativos, funis, VSLs e
            produtos vencedores enquanto seus concorrentes ainda estão testando.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[#06141B] transition-transform hover:scale-[1.03]"
              style={{
                background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
                boxShadow: `0 0 40px ${CY.mint}55`,
              }}
            >
              Começar Agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#beneficios"
              className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition-colors hover:text-white"
              style={{ borderColor: `${CY.cyan}44`, background: `${CY.cyan}0a` }}
            >
              <PlayCircle className="h-4 w-4" />
              Ver Demonstração
            </a>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              { k: "4.3k+", v: "ofertas mineradas" },
              { k: "24/7", v: "coleta automática" },
              { k: "10+", v: "nichos ativos" },
            ].map((s) => (
              <div key={s.v}>
                <div
                  className="font-display text-2xl font-bold"
                  style={{ color: CY.mint }}
                >
                  {s.k}
                </div>
                <div className="text-xs text-white/60">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-6 -z-10 rounded-[2rem] blur-3xl opacity-40"
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, ${CY.mint}, ${CY.cyan}, ${CY.mint})`,
        }}
      />
      <div
        className="relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl"
        style={{
          borderColor: `${CY.cyan}33`,
          background: `linear-gradient(160deg, ${CY.panel}cc, ${CY.bg}ee)`,
          boxShadow: `0 40px 80px -20px #000, 0 0 40px ${CY.cyan}22`,
        }}
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 text-[10px] text-white/40">modelads.spy/dashboard</div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: `${CY.bg}` }}
        >
          {/* filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            {["Nutra", "Info", "Finanças", "Low Ticket"].map((t, i) => (
              <span
                key={t}
                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{
                  color: i === 0 ? "#06141B" : CY.cyan,
                  background:
                    i === 0
                      ? `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`
                      : `${CY.cyan}12`,
                  border: `1px solid ${CY.cyan}${i === 0 ? "00" : "33"}`,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* offer cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Método Alfa", tag: "Escaladíssima", days: 47, ads: 128, color: CY.mint },
              { name: "VSL Beta", tag: "Crescendo", days: 12, ads: 34, color: CY.cyan },
              { name: "Quiz Gamma", tag: "Escaladíssima", days: 63, ads: 210, color: CY.mint },
              { name: "Ebook Delta", tag: "Crescendo", days: 8, ads: 22, color: CY.cyan },
            ].map((o) => (
              <div
                key={o.name}
                className="rounded-lg border p-3"
                style={{
                  borderColor: `${CY.cyan}22`,
                  background: `${CY.panel}66`,
                }}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="text-xs font-semibold">{o.name}</div>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                    style={{
                      color: "#06141B",
                      background: o.color,
                    }}
                  >
                    {o.tag}
                  </span>
                </div>
                <div
                  className="mb-2 h-16 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, ${CY.panel}, ${CY.bg})`,
                    border: `1px solid ${CY.cyan}18`,
                  }}
                />
                <div className="grid grid-cols-2 gap-1 text-[9px] text-white/60">
                  <div>
                    <div style={{ color: CY.mint }}>{o.days}d</div>
                    ativos
                  </div>
                  <div>
                    <div style={{ color: CY.cyan }}>{o.ads}</div>
                    anúncios
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div
        className="absolute -left-4 top-1/3 hidden rounded-xl border p-3 backdrop-blur-xl md:block"
        style={{
          borderColor: `${CY.mint}44`,
          background: `${CY.panel}cc`,
          boxShadow: `0 0 30px ${CY.mint}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" style={{ color: CY.mint }} />
          <div className="text-[10px] font-semibold">Anúncio validado</div>
        </div>
      </div>
      <div
        className="absolute -right-4 bottom-8 hidden rounded-xl border p-3 backdrop-blur-xl md:block"
        style={{
          borderColor: `${CY.cyan}44`,
          background: `${CY.panel}cc`,
          boxShadow: `0 0 30px ${CY.cyan}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: CY.cyan }} />
          <div className="text-[10px] font-semibold">+128 anúncios ativos</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Benefits ---------- */
const BENEFITS = [
  { icon: Trophy, t: "Descubra anúncios escalados" },
  { icon: Target, t: "Encontre produtos vencedores" },
  { icon: FileSearch, t: "Descubra páginas de vendas" },
  { icon: Video, t: "Detecte VSL" },
  { icon: ClipboardList, t: "Detecte Quiz" },
  { icon: Ticket, t: "Detecte Low Ticket" },
  { icon: Package, t: "Detecte Produtos Físicos" },
  { icon: Sparkles, t: "Descubra criativos vencedores" },
  { icon: FolderKanban, t: "Organize anúncios por nicho" },
  { icon: LayoutDashboard, t: "Dashboard Inteligente" },
];

function Benefits() {
  return (
    <section id="beneficios" className="relative z-10 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Benefícios"
          title="Tudo que você precisa para modelar o que já funciona"
          subtitle="Uma stack completa de inteligência para infoprodutores, afiliados e agências que querem parar de adivinhar."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, t }) => (
            <div
              key={t}
              className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                borderColor: `${CY.cyan}22`,
                background: `linear-gradient(160deg, ${CY.panel}88, ${CY.bg}cc)`,
              }}
            >
              <div
                className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at 30% 0%, ${CY.mint}18, transparent 60%)`,
                }}
              />
              <div
                className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
                style={{
                  background: `${CY.mint}18`,
                  border: `1px solid ${CY.mint}33`,
                }}
              >
                <Icon className="h-5 w-5" style={{ color: CY.mint }} />
              </div>
              <div className="text-base font-semibold">{t}</div>
              <div className="mt-1 text-sm text-white/55">
                Inteligência automatizada trabalhando por você 24/7.
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- AI section ---------- */
type Status = "Disponível" | "Em Desenvolvimento" | "Em Breve";
const AI_FEATURES: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; name: string; status: Status }[] = [
  { icon: Bot, name: "ModelAds AI", status: "Disponível" },
  { icon: MessageCircle, name: "Criador de Fluxos WhatsApp", status: "Em Desenvolvimento" },
  { icon: Wand2, name: "Criador de Quiz", status: "Em Desenvolvimento" },
  { icon: ImageIcon, name: "Criador de Criativos", status: "Em Breve" },
  { icon: Clapperboard, name: "Criador de Vídeos", status: "Em Breve" },
  { icon: Mic, name: "Criador de Áudios", status: "Em Breve" },
  { icon: Activity, name: "Tracking Inteligente", status: "Em Desenvolvimento" },
  { icon: BarChart3, name: "Analytics", status: "Disponível" },
  { icon: Workflow, name: "Automação", status: "Em Breve" },
];

function statusStyle(s: Status) {
  if (s === "Disponível")
    return { color: "#06141B", bg: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`, border: "transparent" };
  if (s === "Em Desenvolvimento")
    return { color: CY.cyan, bg: `${CY.cyan}18`, border: `${CY.cyan}44` };
  return { color: "#94a3b8", bg: "#ffffff0a", border: "#ffffff1f" };
}

function AISection() {
  return (
    <section id="ia" className="relative z-10 py-24">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${CY.cyan}55, transparent)` }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Inteligência Artificial"
          title="A suíte de IA que vai substituir sua equipe de criativos"
          subtitle="Gere, otimize e escale — tudo dentro do ModelAds Spy."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_FEATURES.map(({ icon: Icon, name, status }) => {
            const st = statusStyle(status);
            return (
              <div
                key={name}
                className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: `${CY.cyan}22`,
                  background: `linear-gradient(160deg, ${CY.panel}88, ${CY.bg}cc)`,
                }}
              >
                <div
                  className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at 70% 0%, ${CY.cyan}18, transparent 60%)`,
                  }}
                />
                <div className="mb-5 flex items-start justify-between">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{
                      background: `${CY.cyan}18`,
                      border: `1px solid ${CY.cyan}33`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: CY.cyan }} />
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: st.color, background: st.bg, borderColor: st.border }}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-lg font-semibold">{name}</div>
                <div className="mt-1 text-sm text-white/55">
                  Inteligência de ponta pensada para performance.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
const STARTER = [
  "Mineração diária de anúncios",
  "Filtros por nicho e escala",
  "Detector de palavras bloqueadas",
  "Gerador de UTM",
  "Suporte por e-mail",
];
const PRO = [
  "Tudo do Starter",
  "ModelAds AI ilimitado",
  "Fluxos WhatsApp + Quiz",
  "Criativos e vídeos com IA",
  "Analytics e tracking avançado",
  "Suporte prioritário no Discord",
];

function Pricing() {
  return (
    <section id="planos" className="relative z-10 py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <SectionHeader
          eyebrow="Planos"
          title="Escolha seu nível de vantagem competitiva"
          subtitle="Sem fidelidade. Cancele quando quiser."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <PlanCard
            name="Starter"
            price="89,90"
            features={STARTER}
            cta="Começar Agora"
          />
          <PlanCard
            name="PRO"
            price="167"
            features={PRO}
            cta="Assinar Agora"
            highlight
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-8 backdrop-blur-xl transition-transform hover:-translate-y-1"
      style={{
        borderColor: highlight ? `${CY.mint}66` : `${CY.cyan}22`,
        background: highlight
          ? `linear-gradient(160deg, ${CY.panel}, ${CY.bg})`
          : `linear-gradient(160deg, ${CY.panel}88, ${CY.bg}cc)`,
        boxShadow: highlight
          ? `0 30px 80px -30px ${CY.mint}44, 0 0 40px ${CY.mint}18 inset`
          : "none",
      }}
    >
      {highlight && (
        <div
          className="absolute right-6 top-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#06141B]"
          style={{ background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})` }}
        >
          Mais Escolhido
        </div>
      )}
      <div className="text-sm font-semibold uppercase tracking-widest text-white/60">
        Plano {name}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-white/70">R$</span>
        <span
          className="font-display text-6xl font-bold"
          style={{
            color: highlight ? CY.mint : "#fff",
          }}
        >
          {price}
        </span>
        <span className="ml-1 text-sm text-white/60">/mês</span>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-white/80">
            <span
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
              style={{
                background: highlight
                  ? `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`
                  : `${CY.cyan}22`,
              }}
            >
              <Check className="h-3 w-3" style={{ color: highlight ? "#06141B" : CY.cyan }} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/dashboard"
        className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
        style={
          highlight
            ? {
                background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
                color: "#06141B",
                boxShadow: `0 0 40px ${CY.mint}55`,
              }
            : {
                background: "transparent",
                color: "#fff",
                border: `1px solid ${CY.cyan}55`,
              }
        }
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="relative z-10 border-t" style={{ borderColor: `${CY.cyan}18` }}>
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${CY.mint}, ${CY.cyan})`,
                }}
              >
                <Radar className="h-4.5 w-4.5 text-[#06141B]" strokeWidth={2.6} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                ModelAds<span style={{ color: CY.mint }}>Spy</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/55">
              Inteligência de anúncios para quem constrói ofertas vencedoras.
            </p>
          </div>

          <FooterCol title="Legal" links={["Termos", "Privacidade"]} />
          <FooterCol title="Suporte" links={["Contato", "Suporte"]} />
          <FooterCol title="Comunidade" links={["Discord", "WhatsApp"]} />
        </div>

        <div
          className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs text-white/45 md:flex-row md:items-center"
          style={{ borderColor: `${CY.cyan}18` }}
        >
          <div>© {new Date().getFullYear()} ModelAds Spy. Todos os direitos reservados.</div>
          <div>Feito para infoprodutores e afiliados brasileiros.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-white/50">
        {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l}>
            <a
              href="#"
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Shared ---------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{
          borderColor: `${CY.mint}44`,
          color: CY.mint,
          background: `${CY.mint}0d`,
        }}
      >
        {eyebrow}
      </div>
      <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base text-white/60">{subtitle}</p>
    </div>
  );
}
