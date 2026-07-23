import { createFileRoute, Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radar, Loader2, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type AuthSearch = { redirect?: string; mode?: "signin" | "signup" | "forgot" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode:
      s.mode === "signup" || s.mode === "forgot" || s.mode === "signin"
        ? s.mode
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Modelads" },
      { name: "description", content: "Acesse sua conta Modelads e continue minerando ofertas vencedoras." },
      { property: "og:title", content: "Entrar — Modelads" },
      { property: "og:description", content: "Acesse sua conta Modelads." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0..5
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");

  // Common
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  // Signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const to = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
      navigate({ to, replace: true });
    }
  }, [loading, user, navigate, search.redirect]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
      await router.invalidate();
      const to = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
      navigate({ to, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!acceptTerms) {
      toast.error("Você precisa aceitar os Termos de Uso.");
      return;
    }
    if (password !== confirmPw) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (passwordScore(password) < 3) {
      toast.error("Senha fraca. Use ao menos 8 caracteres, com letras e números.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            display_name:
              [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
              email.split("@")[0],
          },
        },
      });
      if (error) throw error;
      toast.success("Conta criada! Verifique seu e-mail se pedirmos confirmação.");
      await router.invalidate();
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link de recuperação para o seu e-mail.");
      setMode("signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar e-mail");
    } finally {
      setBusy(false);
    }
  }

  const score = passwordScore(password);

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
          {mode !== "forgot" && (
            <div className="flex gap-2 rounded-lg bg-muted p-1 mb-6">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  mode === "signin" ? "bg-background text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  mode === "signup" ? "bg-background text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Cadastro
              </button>
            </div>
          )}

          {mode === "signin" && (
            <form onSubmit={onSignIn} className="space-y-4">
              <Field label="E-mail">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="voce@email.com"
                />
              </Field>
              <Field label="Senha">
                <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(!showPw)} autoComplete="current-password" />
              </Field>
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-background accent-brand"
                  />
                  Manter conectado
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-brand hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <SubmitButton busy={busy}>Entrar</SubmitButton>
              <p className="text-center text-xs text-muted-foreground">
                Não tem conta?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-brand hover:underline font-medium">
                  Criar conta grátis
                </button>
              </p>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={onSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input"
                    placeholder="João"
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Sobrenome">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input"
                    placeholder="Silva"
                    autoComplete="family-name"
                  />
                </Field>
              </div>
              <Field label="E-mail">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="voce@email.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Telefone (opcional)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Senha">
                <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(!showPw)} autoComplete="new-password" />
                {password && (
                  <div className="mt-1.5 flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i < score
                            ? score <= 2
                              ? "bg-red-500"
                              : score === 3
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Confirmar senha">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="input"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
              </Field>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-brand"
                />
                <span>
                  Aceito os <span className="text-foreground underline">Termos de Uso</span> e{" "}
                  <span className="text-foreground underline">Política de Privacidade</span>.
                </span>
              </label>
              <SubmitButton busy={busy}>Criar Conta</SubmitButton>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onForgot} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
              <div>
                <h2 className="font-display text-xl font-semibold">Esqueci minha senha</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Digite seu e-mail e enviaremos um link para você redefinir a senha.
                </p>
              </div>
              <Field label="E-mail">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="voce@email.com"
                  autoComplete="email"
                />
              </Field>
              <SubmitButton busy={busy}>
                <Mail className="h-4 w-4" />
                Enviar link de recuperação
              </SubmitButton>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar ao início
          </Link>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: hsl(var(--brand, 142 76% 40%)); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pr-10"
        placeholder="Mínimo 8 caracteres"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:brightness-110 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
