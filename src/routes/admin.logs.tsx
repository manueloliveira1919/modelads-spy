import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/logs")({
  component: LogsPage,
});

const FILTERS = ["Hoje", "7 dias", "30 dias", "Tudo"] as const;
type Filter = (typeof FILTERS)[number];

type Log = {
  id: string;
  user_id: string | null;
  action: string;
  kind: string | null;
  result: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function sinceIso(f: Filter): string | null {
  const d = new Date();
  if (f === "Hoje") d.setHours(0, 0, 0, 0);
  else if (f === "7 dias") d.setDate(d.getDate() - 7);
  else if (f === "30 dias") d.setDate(d.getDate() - 30);
  else return null;
  return d.toISOString();
}

function LogsPage() {
  const [filter, setFilter] = useState<Filter>("7 dias");
  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");

  const logsQuery = useQuery({
    queryKey: ["admin", "system_logs", filter],
    queryFn: async () => {
      let q = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const since = sinceIso(filter);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Log[];
    },
  });

  const kinds = useMemo(() => {
    const set = new Set<string>();
    (logsQuery.data ?? []).forEach((l) => l.kind && set.add(l.kind));
    return Array.from(set);
  }, [logsQuery.data]);

  const rows = useMemo(() => {
    let list = logsQuery.data ?? [];
    if (kind !== "all") list = list.filter((l) => l.kind === kind);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((l) => l.action.toLowerCase().includes(s));
    }
    return list;
  }, [logsQuery.data, kind, search]);

  return (
    <div>
      <AdminPageHeader
        title="Logs"
        description="Registros de ações da plataforma."
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-accent/40 p-1">
            {FILTERS.map((f) => (
              <Button
                key={f}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(f)}
                className={cn(
                  "h-8",
                  filter === f && "bg-brand/10 text-brand hover:bg-brand/15",
                )}
              >
                {f}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar ação..."
          className="sm:w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{rows.length} registros</div>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!logsQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum log neste período.
                </TableCell>
              </TableRow>
            )}
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {l.user_id ? l.user_id.slice(0, 8) : "sistema"}
                </TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{l.kind ?? "—"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      l.result === "error"
                        ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/20"
                        : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20",
                    )}
                  >
                    {l.result ?? "success"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
