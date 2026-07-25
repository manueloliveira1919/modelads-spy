import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logSystem } from "@/lib/admin-log";
import { AdminPageHeader } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfiguracoesAdminPage,
});

type Settings = {
  id: string;
  platform_name: string;
  logo_url: string | null;
  domain: string | null;
  support_email: string | null;
  support_whatsapp: string | null;
  version: string;
  status: string;
};

function ConfiguracoesAdminPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Settings>>({});

  const settingsQuery = useQuery({
    queryKey: ["admin", "platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.id) throw new Error("Configurações não carregadas");
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_name: form.platform_name,
          logo_url: form.logo_url,
          domain: form.domain,
          support_email: form.support_email,
          support_whatsapp: form.support_whatsapp,
          version: form.version,
          status: form.status,
        })
        .eq("id", form.id);
      if (error) throw error;
      await logSystem({ action: "settings.update", kind: "settings" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "platform_settings"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <AdminPageHeader
        title="Configurações"
        description="Preferências gerais da plataforma."
        actions={
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Salvar alterações
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Nome da plataforma"
              value={form.platform_name ?? ""}
              onChange={(v) => setForm({ ...form, platform_name: v })}
            />
            <Field
              label="Logo (URL)"
              placeholder="https://..."
              value={form.logo_url ?? ""}
              onChange={(v) => setForm({ ...form, logo_url: v })}
            />
            <Field
              label="Domínio"
              value={form.domain ?? ""}
              onChange={(v) => setForm({ ...form, domain: v })}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Email de suporte"
              placeholder="suporte@..."
              value={form.support_email ?? ""}
              onChange={(v) => setForm({ ...form, support_email: v })}
            />
            <Field
              label="WhatsApp de suporte"
              placeholder="+55 ..."
              value={form.support_whatsapp ?? ""}
              onChange={(v) => setForm({ ...form, support_whatsapp: v })}
            />
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
              <Input
                className="mt-1 w-32"
                value={form.version ?? ""}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Status do sistema
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {form.status ?? "online"}
                </Badge>
                <Input
                  className="w-32"
                  value={form.status ?? ""}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                />
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
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
