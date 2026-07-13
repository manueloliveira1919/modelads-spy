import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Heart,
  Wrench,
  Sparkles,
  Menu,
  X,
  Radar,
  Search,
  Users,
  Handshake,
  Ghost,
  Video,
  AudioLines,
  ImageIcon,
  FileText,
  Lightbulb,
  Bug,
  Star,
  Crown,
  Bell,
  Sun,
  Coins,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  premium?: boolean;
  soon?: boolean;
};

const MENU: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ofertas", label: "Ofertas", icon: Megaphone },
  { to: "/favoritos", label: "Favoritados", icon: Heart },
  { to: "/buscar", label: "Model Spy", icon: Ghost },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/em-breve", label: "Comunidade", icon: Users },
  { to: "/em-breve", label: "Parceiros", icon: Handshake },
];

const PREMIUM: NavItem[] = [
  { to: "/em-breve", label: "Dark Post Spy", icon: Star, premium: true },
  { to: "/em-breve", label: "Transcritor de Vídeo", icon: Video, premium: true },
  { to: "/em-breve", label: "Gerador de Áudio", icon: AudioLines, premium: true },
  { to: "/em-breve", label: "Gerador de Criativo", icon: ImageIcon, premium: true },
  { to: "/em-breve", label: "Gerador de Produto", icon: FileText, premium: true, soon: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground hover:bg-accent"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar overflow-y-auto">
            <SidebarInner
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              onClose={() => setOpen(false)}
              isMobile
            />
          </aside>
        </>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar">
          <SidebarInner pathname={pathname} />
        </aside>

        <main className="flex-1 lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-30 hidden lg:flex items-center gap-3 border-b border-border bg-background/85 px-6 py-3 backdrop-blur">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Bem-vindo,</span>
              <span className="font-semibold">Zeph</span>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                <Crown className="h-3 w-3" /> Avançado
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-sm font-semibold text-warm">
                <Coins className="h-4 w-4" />
                32
              </div>

              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar ofertas..."
                />
              </div>

              <IconButton label="Tema">
                <Sun className="h-4 w-4" />
              </IconButton>
              <IconButton label="Notificações">
                <Bell className="h-4 w-4" />
              </IconButton>

              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground text-sm font-bold">
                Z
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarInner({
  pathname,
  onNavigate,
  onClose,
  isMobile,
}: {
  pathname: string;
  onNavigate?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2">
          <Logo />
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <SectionLabel>Menu</SectionLabel>
        <NavList items={MENU} pathname={pathname} onNavigate={onNavigate} />

        <div className="mt-6">
          <SectionLabel>
            <Crown className="mr-1 inline h-3 w-3 text-warm" />
            Premium
          </SectionLabel>
          <NavList items={PREMIUM} pathname={pathname} onNavigate={onNavigate} />
        </div>

        <div className="mt-6 space-y-2">
          <CTACard
            icon={Lightbulb}
            title="Tem uma ideia?"
            subtitle="Envie sua sugestão"
            tone="brand"
          />
          <CTACard
            icon={Bug}
            title="Reportar Bug"
            subtitle="Encontrou um problema?"
            tone="hot"
          />
          <CTACard
            icon={Handshake}
            title="Seja um Parceiro"
            subtitle="Faça parte do time"
            tone="warm"
          />
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground text-sm font-bold">
            Z
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold">Zeph</div>
            <div className="truncate text-xs text-muted-foreground">
              zeph@modelads.io
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5">
      {items.map((n) => {
        const active = pathname === n.to;
        const Icon = n.icon;
        return (
          <Link
            key={`${n.to}-${n.label}`}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand" />
            )}
            <Icon className="h-4 w-4" />
            <span className="flex-1 truncate">{n.label}</span>
            {n.premium && !n.soon && (
              <Crown className="h-3 w-3 text-warm/80" />
            )}
            {n.soon && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Em breve
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </div>
  );
}

function CTACard({
  icon: Icon,
  title,
  subtitle,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone: "brand" | "hot" | "warm";
}) {
  const toneMap = {
    brand: "bg-brand/15 text-brand",
    hot: "bg-hot/15 text-hot",
    warm: "bg-warm/20 text-warm",
  } as const;
  return (
    <button className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-card/40 p-2.5 text-left transition-colors hover:bg-card/70">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
          toneMap[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function IconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
        <Radar className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-base font-bold tracking-tight">
          Model<span className="text-gradient-brand">ads</span>
        </span>
        <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-brand/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand">
          <Crown className="h-2.5 w-2.5" /> Avançado
        </span>
      </div>
    </div>
  );
}
