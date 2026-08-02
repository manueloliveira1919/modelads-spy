import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  Brain,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Filter,
  Flame,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  LineChart,
  Mic,
  MonitorPlay,
  PenLine,
  Rocket,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Video,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Hero --------------------------------- */

const heroBenefits = [
  "Biblioteca de ofertas atualizada diariamente",
  "Análise completa de anúncios",
  "Descubra páginas de vendas vencedoras",
  "Ferramentas exclusivas com inteligência artificial",
  "Economia de horas de pesquisa",
];

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-14 pb-20 sm:px-8 lg:px-12 lg:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, #3B82F6 0%, #8B5CF6 45%, transparent 70%)" }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gold backdrop-blur">
            <Flame className="h-3.5 w-3.5" /> Mais de 10.000 ofertas analisadas
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Descubra ofertas <span className="text-gradient-brand">vencedoras</span> antes da
            concorrência
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Encontre anúncios lucrativos, analise páginas de vendas, descubra criativos e escale
            suas campanhas com a plataforma mais completa para afiliados e gestores de tráfego.
          </p>

          <ul className="mt-7 space-y-2.5">
            {heroBenefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15">
                  <Check className="h-3 w-3 text-success" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="bg-gradient-brand inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#planos"
              className="btn-secondary-glass inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-foreground"
            >
              Ver planos
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-60 blur-3xl"
            style={{ background: "linear-gradient(120deg, #2563EB55, #06B6D455, #8B5CF655)" }}
          />
          <div className="glow-brand relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-card/70 backdrop-blur">
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
                  <MonitorPlay className="h-6 w-6 text-brand" />
                </div>
                <p className="mt-4 font-display text-lg font-bold text-foreground/90">
                  Preview da plataforma Modelads Spy IA
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Em breve: demonstração em vídeo da plataforma
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Section -------------------------------- */

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</span>
      ) : null}
      <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

const whyCards = [
  { icon: Target, title: "Encontre ofertas lucrativas", desc: "Descubra produtos vencedores antes dos concorrentes." },
  { icon: Search, title: "Analise anúncios", desc: "Veja páginas, criativos e estratégias utilizadas." },
  { icon: Clock, title: "Economize tempo", desc: "Pare de perder horas procurando ofertas manualmente." },
  { icon: TrendingUp, title: "Escale campanhas", desc: "Use dados reais para tomar decisões." },
];

function Why() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Vantagens" title="Por que usar a Modelads Spy IA?" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyCards.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card-elevate rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: BookMarked, label: "Biblioteca de ofertas" },
  { icon: Star, label: "Favoritos" },
  { icon: Search, label: "Pesquisa avançada" },
  { icon: ImageIcon, label: "Biblioteca de anúncios" },
  { icon: LineChart, label: "Análise de páginas" },
  { icon: LayoutDashboard, label: "Dashboard inteligente" },
  { icon: Filter, label: "Filtros por nicho" },
  { icon: Globe2, label: "Filtros por país" },
  { icon: Languages, label: "Filtros por idioma" },
];

function Features() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Recursos" title="Tudo o que você terá acesso" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="card-elevate flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#3B82F6]/25 to-[#06B6D4]/25 text-brand">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const aiTools = [
  { icon: Wand2, label: "Modelador de anúncios" },
  { icon: PenLine, label: "Gerador de copy" },
  { icon: Sparkles, label: "Gerador de criativos" },
  { icon: Brain, label: "Criador de quiz" },
  { icon: Video, label: "Criador de VSL" },
  { icon: BarChart3, label: "Analisador de campanhas" },
  { icon: Gauge, label: "Criador de roteiros" },
  { icon: Mic, label: "Criador de áudio" },
];

function AiTools() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Inteligência artificial"
          title="Ferramentas com Inteligência Artificial"
          subtitle="As ferramentas abaixo estarão disponíveis nos planos PRO e PLUS e funcionarão com créditos mensais."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {aiTools.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="card-elevate relative overflow-hidden rounded-2xl border border-gold/25 bg-white/[0.03] p-5 backdrop-blur"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                ⭐ Exclusivo PRO e PLUS
              </span>
              <div className="mt-4 grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold">{label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Pricing -------------------------------- */

function Pricing() {
  return (
    <section id="planos" className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Planos" title="Escolha o plano ideal" />

        <div className="mt-14 grid items-center gap-6 lg:grid-cols-3">
          {/* Básico */}
          <div className="card-elevate rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
            <h3 className="font-display text-lg font-bold">Plano Básico</h3>
            <p className="mt-1 text-xs text-muted-foreground">Ideal para quem está começando.</p>
            <p className="mt-5 font-display text-4xl font-extrabold">
              R$ 79,90
              <span className="text-base font-semibold text-muted-foreground">/mês</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Biblioteca de ofertas",
                "Dashboard completo",
                "Favoritos",
                "Pesquisa avançada",
                "Biblioteca de anúncios",
                "Filtros por nicho",
                "Filtros por idioma",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className="bg-gradient-brand mt-7 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold"
            >
              ASSINAR AGORA
            </Link>
          </div>

          {/* PRO */}
          <div className="pro-shine card-elevate relative rounded-2xl border border-gold/40 bg-white/[0.05] p-8 backdrop-blur lg:scale-[1.06]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-black uppercase tracking-wide">
              🔥 Mais popular
            </span>
            <h3 className="font-display text-lg font-bold text-gradient-gold">Plano PRO</h3>
            <p className="mt-5 font-display text-4xl font-extrabold text-gold">Em breve</p>
            <p className="mt-4 text-sm font-semibold">Inclui tudo do Básico mais:</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[
                "Ferramentas de IA",
                "Créditos mensais",
                "Gerador de criativos",
                "Modelador de ofertas",
                "Criador de quiz",
                "Criador de VSL",
                "Análise avançada",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground/90">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="bg-gradient-gold mt-7 w-full cursor-not-allowed rounded-xl px-5 py-3 text-sm font-black"
            >
              EM BREVE
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Plano com créditos mensais para utilização das ferramentas de IA.
            </p>
          </div>

          {/* PLUS */}
          <div className="card-elevate rounded-2xl border border-vsl/30 bg-white/[0.03] p-7 backdrop-blur">
            <span className="inline-flex items-center gap-1 rounded-full bg-vsl/15 px-2.5 py-1 text-[10px] font-bold uppercase text-vsl">
              👑 Premium
            </span>
            <h3 className="mt-3 font-display text-lg font-bold">Plano PLUS</h3>
            <p className="mt-5 font-display text-4xl font-extrabold text-gradient-gold">Em breve</p>
            <p className="mt-4 text-sm font-semibold">Inclui tudo do PRO mais:</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[
                "Mais créditos mensais",
                "Ferramentas ilimitadas",
                "Prioridade em atualizações",
                "Recursos exclusivos",
                "Suporte prioritário",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground/90">
                  <Crown className="mt-0.5 h-4 w-4 shrink-0 text-vsl" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="bg-gradient-gold mt-7 w-full rounded-xl px-5 py-3 text-sm font-black">
              LISTA DE ESPERA
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Plano criado para profissionais e agências.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Depoimentos ------------------------------- */

const testimonials = [
  { name: "Cliente Modelads", revenue: "R$ 48.900 faturados", text: "Encontrei uma oferta escalando em minutos e modelei a estrutura no mesmo dia." },
  { name: "Cliente Modelads", revenue: "R$ 120.300 faturados", text: "Economizo horas de pesquisa por semana. Hoje só entro em oferta já validada." },
  { name: "Cliente Modelads", revenue: "R$ 31.500 faturados", text: "A análise de criativos e páginas mudou completamente minha taxa de acerto." },
];

function Testimonials() {
  const [i, setI] = useState(0);
  const total = testimonials.length;
  const go = (d: number) => setI((p) => (p + d + total) % total);
  const t = testimonials[i];

  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <SectionTitle
          eyebrow="Prova social"
          title="Resultados reais dos nossos clientes"
          subtitle="Veja os resultados de quem já utiliza a Modelads Spy IA."
        />

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_1.2fr] sm:items-center">
            <div
              className="grid aspect-[4/3] place-items-center rounded-xl border border-white/10 text-xs text-muted-foreground"
              style={{ background: "linear-gradient(135deg, #2563EB33, #8B5CF633)" }}
            >
              Print do resultado
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-extrabold text-gradient-gold">{t.revenue}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <p className="mt-4 text-sm font-semibold">{t.name}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Depoimento ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === i ? "w-6 bg-brand" : "w-1.5 bg-white/20",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Anterior"
                onClick={() => go(-1)}
                className="btn-secondary-glass grid h-9 w-9 place-items-center rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Próximo"
                onClick={() => go(1)}
                className="btn-secondary-glass grid h-9 w-9 place-items-center rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- FAQ ---------------------------------- */

const faqs = [
  { q: "As ofertas são atualizadas diariamente?", a: "Sim." },
  { q: "Posso cancelar quando quiser?", a: "Sim." },
  { q: "Preciso entender de tráfego pago?", a: "Não." },
  {
    q: "As ferramentas de IA possuem limite?",
    a: "Sim, os planos PRO e PLUS funcionam com créditos mensais.",
  },
  { q: "Posso acessar pelo celular?", a: "Sim." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-5 py-20 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
        <div className="mt-10 space-y-3">
          {faqs.map((f, idx) => (
            <div
              key={f.q}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur"
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold"
              >
                <span className="min-w-0">{f.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", open === idx && "rotate-180")}
                />
              </button>
              {open === idx ? (
                <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- CTA ---------------------------------- */

function FinalCta() {
  return (
    <section className="px-5 pb-24 sm:px-8 lg:px-12">
      <div
        className="glow-brand relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 px-6 py-16 text-center"
        style={{ background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 45%, #8B5CF6 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[700px] -translate-x-1/2 rounded-full bg-white/20 blur-[100px]"
        />
        <h2 className="relative font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Pare de perder tempo procurando ofertas manualmente
        </h2>
        <p className="relative mx-auto mt-4 max-w-2xl text-sm text-white/85">
          Comece hoje mesmo a encontrar anúncios vencedores e descubra oportunidades antes da
          concorrência.
        </p>
        <Link
          to="/auth"
          className="relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-background px-8 py-4 text-sm font-black text-foreground shadow-2xl hover:brightness-110"
        >
          <Rocket className="h-4 w-4" /> COMEÇAR AGORA
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="font-display text-lg font-extrabold text-gradient-brand">
            Modelads Spy IA
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="btn-secondary-glass hidden rounded-lg px-4 py-2 text-sm font-semibold sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="bg-gradient-brand rounded-lg px-4 py-2 text-sm font-bold"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <Why />
        <Features />
        <AiTools />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>

      <footer className="border-t border-white/8 px-5 py-8 text-center text-xs text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} Modelads Spy IA · Todos os direitos reservados
      </footer>
    </div>
  );
}
