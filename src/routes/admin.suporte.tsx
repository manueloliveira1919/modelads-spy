import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/suporte")({
  component: SuportePage,
});

function SuportePage() {
  return (
    <div>
      <AdminPageHeader
        title="Suporte"
        description="Chamados abertos pelos usuários."
      />

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">—</TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell>—</TableCell>
              <TableCell>
                <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/20">
                  Aberto
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
