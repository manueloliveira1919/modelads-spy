import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfiguracoesAdminPage,
});

function ConfiguracoesAdminPage() {
  return (
    <div>
      <AdminPageHeader
        title="Configurações"
        description="Preferências gerais da plataforma."
        actions={<Button>Salvar alterações</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Nome da plataforma" defaultValue="Modelads" />
            <Field label="Logo (URL)" placeholder="https://..." />
            <Field label="Domínio" defaultValue="modelads-spy.lovable.app" />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Email de suporte" placeholder="suporte@..." />
            <Field label="WhatsApp de suporte" placeholder="+55 ..." />
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Versão
              </div>
              <div className="mt-1 font-display text-lg font-bold">v0.1.0</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Status do sistema
              </div>
              <div className="mt-1">
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
