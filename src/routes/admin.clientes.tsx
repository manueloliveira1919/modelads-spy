import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Search, UserX, UserCheck, Repeat, Coins } from "lucide-react";
import { adminAdjustCredits } from "@/lib/entitlements";

export const Route = createFileRoute("/admin/clientes")({
  component: ClientesPage,
});

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_suspended: boolean;
  created_at: string;
};

type Role = "starter" | "pro" | "premium" | "plus" | "admin";
const ROLES: Role[] = ["starter", "pro", "premium", "plus", "admin"];

function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creditTarget, setCreditTarget] = useState<Profile | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const creditsQuery = useQuery({
    queryKey: ["admin", "credits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credits").select("user_id, balance");
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((c) => map.set(c.user_id, c.balance));
      return map;
    },
  });

  const adjustMut = useMutation({
    mutationFn: async (args: { userId: string; amount: number; reason: string }) => {
      const res = await adminAdjustCredits(args.userId, args.amount, args.reason);
      if (!res.ok) throw new Error(res.message ?? "Não foi possível ajustar os créditos.");
      await logSystem({
        action: "user.credits_adjust",
        kind: "user",
        metadata: { user_id: args.userId, amount: args.amount, reason: args.reason },
      });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "credits"] });
      setCreditTarget(null);
      setCreditAmount("");
      setCreditReason("");
      toast.success(`Créditos atualizados. Novo saldo: ${res.balance}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const profilesQuery = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const rolesQuery = useQuery({
    queryKey: ["admin", "all_user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map = new Map<string, Role[]>();
      (data ?? []).forEach((r) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role as Role);
        map.set(r.user_id, arr);
      });
      return map;
    },
  });

  const rows = useMemo(() => {
    let list = profilesQuery.data ?? [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.email ?? "").toLowerCase().includes(s) ||
          (p.display_name ?? "").toLowerCase().includes(s) ||
          (p.first_name ?? "").toLowerCase().includes(s) ||
          (p.last_name ?? "").toLowerCase().includes(s),
      );
    }
    return list;
  }, [profilesQuery.data, search]);

  const setRoleMut = useMutation({
    mutationFn: async (args: { userId: string; role: Role }) => {
      // Substitui todos os papéis por um único: apaga e insere.
      const del = await supabase.from("user_roles").delete().eq("user_id", args.userId);
      if (del.error) throw del.error;
      const ins = await supabase
        .from("user_roles")
        .insert({ user_id: args.userId, role: args.role });
      if (ins.error) throw ins.error;
      await logSystem({
        action: "user.plan_change",
        kind: "user",
        metadata: { user_id: args.userId, role: args.role },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "all_user_roles"] });
      toast.success("Plano atualizado");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const suspendMut = useMutation({
    mutationFn: async (args: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: args.suspend })
        .eq("id", args.userId);
      if (error) throw error;
      await logSystem({
        action: args.suspend ? "user.suspend" : "user.reactivate",
        kind: "user",
        metadata: { user_id: args.userId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
      toast.success("Conta atualizada");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function primaryRole(userId: string): Role {
    const rs = rolesQuery.data?.get(userId) ?? [];
    if (rs.includes("admin")) return "admin";
    if (rs.includes("premium")) return "premium";
    if (rs.includes("plus")) return "plus";
    if (rs.includes("pro")) return "pro";
    return "starter";
  }

  return (
    <div>
      <AdminPageHeader
        title="Clientes"
        description="Gerencie os usuários da plataforma."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-9 sm:w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />
      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {profilesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!profilesQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => {
              const role = primaryRole(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.display_name ??
                      [p.first_name, p.last_name].filter(Boolean).join(" ") ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={role}
                      onValueChange={(v) =>
                        setRoleMut.mutate({ userId: p.id, role: v as Role })
                      }
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {role === "admin" ? (
                      <span className="text-muted-foreground">Ilimitado</span>
                    ) : (
                      <span className="font-medium">{creditsQuery.data?.get(p.id) ?? 0}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.is_suspended ? (
                      <Badge className="bg-rose-500/15 text-rose-400 hover:bg-rose-500/20">
                        Suspenso
                      </Badge>
                    ) : (
                      <Badge className="bg-success/15 text-success hover:bg-success/20">
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Trocar plano</DropdownMenuLabel>
                        {ROLES.map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => setRoleMut.mutate({ userId: p.id, role: r })}
                          >
                            <Repeat className="mr-2 h-4 w-4" /> {r}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setCreditTarget(p);
                            setCreditAmount("");
                            setCreditReason("");
                          }}
                        >
                          <Coins className="mr-2 h-4 w-4" /> Ajustar créditos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.is_suspended ? (
                          <DropdownMenuItem
                            onClick={() =>
                              suspendMut.mutate({ userId: p.id, suspend: false })
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Reativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              suspendMut.mutate({ userId: p.id, suspend: true })
                            }
                          >
                            <UserX className="mr-2 h-4 w-4" /> Suspender
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(creditTarget)} onOpenChange={(o) => !o && setCreditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar créditos</DialogTitle>
            <DialogDescription>
              {creditTarget?.email ?? creditTarget?.display_name ?? "Usuário"} — saldo atual:{" "}
              {creditTarget ? (creditsQuery.data?.get(creditTarget.id) ?? 0) : 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Quantidade (use -50 para remover)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
            <Input
              placeholder="Motivo (opcional)"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreditTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={adjustMut.isPending || !creditTarget || !Number(creditAmount)}
              onClick={() =>
                creditTarget &&
                adjustMut.mutate({
                  userId: creditTarget.id,
                  amount: Number(creditAmount),
                  reason: creditReason,
                })
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
