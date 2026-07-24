import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Power, Search } from "lucide-react";

export const Route = createFileRoute("/admin/palavras-chave")({
  component: KeywordsPage,
});

const CATEGORIES = [
  "Info",
  "Nutra",
  "Saúde",
  "Finanças",
  "Relacionamento",
  "Religião",
  "Cursos",
  "Mentorias",
  "Aplicativos",
  "Concurso",
  "Idiomas",
];

function KeywordsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Palavras-chave"
        description="Gerencie termos usados na mineração."
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar palavra
          </Button>
        }
      />

      <Tabs defaultValue={CATEGORIES[0]}>
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {CATEGORIES.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="rounded-md border border-transparent bg-accent/40 px-3 py-1.5 data-[state=active]:border-brand/30 data-[state=active]:bg-brand/10 data-[state=active]:text-brand"
            >
              {c}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={`Buscar em ${c}...`} className="pl-9 sm:w-72" />
              </div>
              <div className="text-xs text-muted-foreground">0 palavras</div>
            </div>
            <Card className="overflow-hidden border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Palavra</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última alteração</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Inativo</Badge>
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
                            <Power className="mr-2 h-4 w-4" /> Ativar/Desativar
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
