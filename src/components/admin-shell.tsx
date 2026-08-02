import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Database,
  KeyRound,
  Ban,
  Tag,
  ShieldCheck,
  ScrollText,
  LifeBuoy,
  Settings,
  Radar,
  ArrowLeft,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/mineracao", label: "Mineração", icon: Database },
  { to: "/admin/palavras-chave", label: "Palavras-chave", icon: KeyRound },
  { to: "/admin/blacklist", label: "Blacklist", icon: Ban },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/qualidade", label: "Qualidade da Mineração", icon: ShieldCheck },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
        <Radar className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-sm font-bold">Modelads</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
          Admin
        </span>
      </div>
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { data: openTickets } = useQuery({
    queryKey: ["admin", "tickets", "open-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  return (
    <nav className="space-y-0.5">
      {NAV.map((n) => {
        const active =
          n.to === "/admin"
            ? pathname === "/admin"
            : pathname === n.to || pathname.startsWith(n.to + "/");
        const Icon = n.icon;
        const badge = n.to === "/admin/suporte" ? (openTickets ?? 0) : 0;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-brand text-white shadow-lg"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{n.label}</span>
            {badge > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);


  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <BrandMark />
        <button
          type="button"
          aria-label="Abrir menu do admin"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between px-5">
              <BrandMark />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Painel
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-sidebar-border p-3">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar ao app
              </Link>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-5">
          <BrandMark />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Painel
          </div>
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao app
          </Link>
        </div>
      </aside>

      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>

      </main>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
