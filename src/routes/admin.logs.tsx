import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function LogsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Hoje");

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
            <TableRow>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell>—</TableCell>
              <TableCell>—</TableCell>
              <TableCell>
                <Badge variant="secondary">—</Badge>
              </TableCell>
              <TableCell>
                <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  Sucesso
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
