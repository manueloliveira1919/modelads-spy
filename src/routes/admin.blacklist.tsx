import { createFileRoute } from "@tanstack/react-router";
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
} from "@/components/ui/dropdown-menu";
import { Plus, Upload, Download, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/blacklist")({
  component: BlacklistPage,
});

const CATS = [
  "Entretenimento",
  "Filmes",
  "Séries",
  "Novelas",
  "Apps",
  "Política",
  "Notícias",
  "Esportes",
  "ONGs",
  "Marketplace",
  "Empregos",
];

function BlacklistPage() {
  return (
    <div>
      <AdminPageHeader
        title="Blacklist"
        description="Termos que devem ser excluídos da mineração."
        actions={
          <>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar palavra..." className="pl-9 sm:w-72" />
        </div>
        <Select>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            {CATS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Palavra</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última alteração</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">—</TableCell>
              <TableCell>
                <Badge variant="secondary">—</Badge>
              </TableCell>
              <TableCell>
                <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  Ativo
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
