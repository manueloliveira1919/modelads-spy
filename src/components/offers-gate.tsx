import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { useEntitlements } from "@/hooks/use-entitlements";

/** Ofertas exigem plano pago ativo (ou admin). O servidor aplica a mesma regra. */
export function useCanViewOffers() {
  const { user, loading: authLoading } = useAuth();
  const { hasFeature, loading } = useEntitlements();
  return {
    canView: Boolean(user) && hasFeature("vitrine_ofertas"),
    loading: authLoading || (Boolean(user) && loading),
  };
}

export function OfferLockCard({ compact }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center py-6 text-center"
          : "relative overflow-hidden rounded-2xl border border-brand/30 bg-card p-8 sm:p-12"
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-gold pro-shine">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold sm:text-2xl">
          Ative um plano para ver as ofertas
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          As ofertas escaladas, a busca e a extensão ficam disponíveis a partir do plano Starter.
        </p>
        <Link
          to="/upgrade"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-5 py-2.5 text-sm font-bold"
        >
          <Sparkles className="h-4 w-4" />
          Ver planos
        </Link>
      </div>
    </div>
  );
}

export function OffersGate({ children }: { children: ReactNode }) {
  const { canView, loading } = useCanViewOffers();
  if (loading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />
      </AppShell>
    );
  }
  if (!canView) {
    return (
      <AppShell>
        <OfferLockCard />
      </AppShell>
    );
  }
  return <>{children}</>;
}
