import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radar, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Modelads" },
      { name: "description", content: "Defina uma nova senha para acessar o Modelads." },
      { property: "og:title", content: "Redefinir senha — Modelads" },
      { property: "og:description", content: "Defina uma nova senha para sua conta Modelads." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery token from the URL hash and emits
    // PASSWORD_RECOVERY. Simply wait for a session/event before enabling the form.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirmPw) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida! Faça login novamente.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao redefinir senha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-brand-foreground">
            <Radar className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">
            Model<span className="text-gradient-brand">ads</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <h1 className="font-display text-xl font-semibold">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Escolha uma nova senha para sua conta."
              : "Validando link de recuperação..."}
          </p>

          {ready && (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nova senha</label>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand"
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Confirmar senha</label>
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Redefinir senha
              </button>
            </form>
          )}

          {!ready && (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Aguarde...
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
