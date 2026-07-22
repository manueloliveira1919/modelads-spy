import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Flame,
  Heart,
  
  Menu,
  X,
  Radar,
  User,
  Settings,
  Bot,
  FileText,
  MessageCircle,
  HelpCircle,
  Image as ImageIcon,
  Mic,
  Video,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useProLock } from "@/components/pro-lock-modal";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
};

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/ofertas-do-dia", label: "Ofertas do Dia", icon: Flame },
      { to: "/favoritos", label: "Favoritos", icon: Heart },
    ],
  },
  {
    title: "Ferramentas IA",
    items: [
      { to: "/modela-spy-ai", label: "Modela Spy AI", icon: Bot, pro: true },
      { to: "/modelar-oferta", label: "Modelar Oferta", icon: FileText, pro: true },
      { to: "/modelar-whatsapp", label: "Modelar Funil WhatsApp", icon: MessageCircle, pro: true },
      { to: "/modelar-quiz", label: "Modelar Quiz", icon: HelpCircle, pro: true },
      { to: "/criador-criativos", label: "Criador de Criativos", icon: ImageIcon, pro: true },
      { to: "/criador-audios", label: "Criador de Áudios", icon: Mic, pro: true },
      { to: "/criador-vsl", label: "Criador de VSL", icon: Video, pro: true },
    ],
  },
  {
    title: "Conta",
    items: [
      { to: "/minha-conta", label: "Minha Conta", icon: User },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
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
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar p-4 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 hover:bg-accent"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav pathname={pathname} onNavigate={() => setOpen(false)} />
            <UserFooter />
          </nav>
        </>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar">
          <div className="flex h-16 items-center px-5">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <SidebarNav pathname={pathname} />
          </div>
          <UserFooter />
        </aside>

        <main className="flex-1 lg:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { isPro } = useAuth();
  const proLock = useProLock();

  return (
    <div className="space-y-4">
      {SECTIONS.map((section, i) => (
        <div key={i}>
          {section.title && (
            <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {section.title}
            </div>
          )}
          <nav className="space-y-0.5">
            {section.items.map((n) => {
              const active = pathname === n.to;
              const Icon = n.icon;
              const locked = n.pro && !isPro;

              const inner = (
                <>
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{n.label}</span>
                  {n.pro && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        locked
                          ? "bg-brand/15 text-brand"
                          : "bg-emerald-500/15 text-emerald-400",
                      )}
                    >
                      {locked && <Lock className="h-2.5 w-2.5" />}
                      PRO
                    </span>
                  )}
                </>
              );

              const baseCls = cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                locked && "opacity-80",
              );

              if (locked) {
                return (
                  <button
                    key={n.to}
                    type="button"
                    onClick={() => {
                      onNavigate?.();
                      proLock.open();
                    }}
                    className={cn(baseCls, "w-full text-left")}
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={onNavigate}
                  className={baseCls}
                >
                  {inner}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

function UserFooter() {
  const { user, roles, isPro, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const plan = isAdmin ? "Admin" : isPro ? "PRO" : "Starter";
  const email = user?.email ?? "Convidado";

  return (
    <div className="border-t border-sidebar-border p-3">
      {user ? (
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{email}</div>
            <div className="truncate text-xs text-muted-foreground">
              Plano <span className={cn("font-semibold", isPro && "text-brand")}>{plan}</span>
              {roles.length === 0 && " · carregando"}
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sair"
            title="Sair"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Link
          to="/auth"
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-foreground">Entrar</div>
            <div className="truncate text-xs text-muted-foreground">Criar conta grátis</div>
          </div>
        </Link>
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
        <Radar className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <span className="font-display text-lg font-bold tracking-tight">
        Model<span className="text-gradient-brand">ads</span>
      </span>
    </div>
  );
}

