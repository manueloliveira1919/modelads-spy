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
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ofertas", label: "Ofertas", icon: Megaphone },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/em-breve", label: "Em Breve", icon: Sparkles },
] as const;

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
          <nav className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar p-4 overflow-y-auto">
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
          </nav>
        </>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar - fixed, always visible */}
        <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar">
          <div className="flex h-16 items-center px-5">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Menu
            </div>
            <SidebarNav pathname={pathname} />
          </div>

          {/* User / plan footer */}
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  Você
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Plano Free · 50 créditos
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:pl-60">
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
  return (
    <nav className="space-y-1">
      {NAV.map((n) => {
        const active = pathname === n.to;
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" />
            )}
            <Icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
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
