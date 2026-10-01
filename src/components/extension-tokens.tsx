import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateExtensionToken } from "@/lib/extension.functions";

type TokenRow = {
  id: string;
  user_id: string;
  token_prefix: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

async function revoke(id: string) {
  const { data, error } = await supabase.rpc("revoke_extension_token", { p_id: id });
  if (error || !data) throw new Error("Não foi possível revogar.");
}

export function MyExtensionTokens({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateExtensionToken);
  const [shown, setShown] = useState<string | null>(null);
  const key = ["extension-tokens", userId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_tokens")
        .select("id, user_id, token_prefix, created_at, last_used_at, revoked_at")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TokenRow[];
    },
  });
  const genMut = useMutation({
    mutationFn: () => gen(),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.message);
      setShown(r.token);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Não foi possível gerar o token."),
  });
  const revMut = useMutation({
    mutationFn: revoke,
    onSuccess: () => {
      toast.success("Token revogado.");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-5 w-5" /> Extensão do navegador
        </h3>
        <button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-3 py-1.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {genMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Gerar token
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Use o token para conectar a extensão à sua conta.
      </p>

      {shown && (
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-semibold">Copie agora — este token não será exibido novamente.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-background p-2 text-xs">{shown}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shown);
                toast.success("Token copiado.");
              }}
              className="rounded-lg border border-border p-2 hover:bg-accent"
              aria-label="Copiar token"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShown(null)} className="mt-2 text-xs text-muted-foreground underline">
            Já copiei
          </button>
        </div>
      )}

      {q.isLoading ? (
        <div className="mt-4 h-12 animate-pulse rounded-xl bg-muted/50" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum token ativo.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {q.data!.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <code className="text-xs">{t.token_prefix ?? "mdl_"}…</code>
                <div className="text-xs text-muted-foreground">
                  Criado {fmt(t.created_at)} · Último uso {fmt(t.last_used_at)}
                </div>
              </div>
              <button
                onClick={() => confirm("Revogar este token? A extensão será desconectada.") && revMut.mutate(t.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminExtensionTokens({ emailById }: { emailById: Record<string, string> }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-extension-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_tokens")
        .select("id, user_id, token_prefix, created_at, last_used_at, revoked_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TokenRow[];
    },
  });
  const revMut = useMutation({
    mutationFn: revoke,
    onSuccess: () => {
      toast.success("Token revogado.");
      qc.invalidateQueries({ queryKey: ["admin-extension-tokens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-card p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
        <KeyRound className="h-5 w-5" /> Tokens de extensão ativos
      </h3>
      {q.isLoading ? (
        <div className="mt-4 h-12 animate-pulse rounded-xl bg-muted/50" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum token ativo.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {q.data!.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{emailById[t.user_id] ?? t.user_id}</div>
                <div className="text-xs text-muted-foreground">
                  <code>{t.token_prefix ?? "mdl_"}…</code> · Criado {fmt(t.created_at)} · Último uso {fmt(t.last_used_at)}
                </div>
              </div>
              <button
                onClick={() => confirm("Revogar este token?") && revMut.mutate(t.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
