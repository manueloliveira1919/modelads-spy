import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { AppRole } from "@/lib/auth-context";

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: AppRole;
}) {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: pathname } as never, replace: true });
    }
  }, [loading, user, navigate, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role) {
    const allowed = roles.includes(role) || roles.includes("admin");
    if (!allowed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você não tem permissão para acessar esta área.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
