import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Lock, Sparkles, X } from "lucide-react";

interface ProLockCtx {
  open: () => void;
}
const Ctx = createContext<ProLockCtx | null>(null);

export function ProLockProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();

  const features = [
    "Modelar Ofertas",
    "Modelar Funis WhatsApp",
    "Modelar Quiz",
    "Criador de Criativos",
    "Criador de Áudios",
    "Criador de VSL",
  ];

  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-brand/40 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand/25 to-transparent pointer-events-none" />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative p-6">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/20 text-brand">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold">
                <span className="text-gradient-brand">Desbloqueie</span> o ModelAds PRO
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Você está utilizando o plano Starter. Faça upgrade para desbloquear todas as
                ferramentas de Inteligência Artificial do ModelAds.
              </p>
              <ul className="mt-5 space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand/15 text-brand">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/upgrade" });
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/25 hover:brightness-110"
                >
                  <Sparkles className="h-4 w-4" />
                  Fazer Upgrade
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Agora Não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useProLock() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProLock must be used within ProLockProvider");
  return ctx;
}
