import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Shield, UserCog, UserX, Repeat } from "lucide-react";

export const Route = createFileRoute("/admin/clientes")({
  component: ClientesPage,
});

const ROWS = [
  { name: "—", email: "—", phone: "—", plan: "Starter", status: "Ativo", created: "—", last: "—" },
];

function ClientesPage() {
  return (
    <div>
      <AdminPageHeader
        title="Clientes"
        description="Gerencie os usuários da plataforma."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." className="pl-9 sm:w-72" />
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
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.plan}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.created}</TableCell>
                <TableCell className="text-muted-foreground">{r.last}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <UserCog className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Repeat className="mr-2 h-4 w-4" /> Trocar plano
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserX className="mr-2 h-4 w-4" /> Suspender
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" /> Promover para Admin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
