import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Puzzle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { processExtensionCandidates } from "@/lib/extension-candidates.functions";

export function ExtensionCandidatesCard() {
  const qc = useQueryClient();
  const process = useServerFn(processExtensionCandidates);
  const { data: pending = 0 } = useQuery({
    queryKey: ["admin", "extension-candidates", "pending"],
    queryFn: async () => {
      const { count } = await supabase
        .from("extension_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
  const mut = useMutation({
    mutationFn: () => process(),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.message);
      toast.success(
        r.processed
          ? `${r.processed} candidatos enviados para classificação`
          : r.recovered
            ? `${r.recovered} reservas abandonadas devolvidas à fila`
            : "Nenhum candidato pendente (ou já em processamento)",
      );
      qc.invalidateQueries({ queryKey: ["admin", "extension-candidates"] });
    },
    onError: () => toast.error("Falha ao processar candidatos."),
  });

  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Puzzle className="h-5 w-5 text-brand" />
          <div>
            <div className="text-sm font-semibold">Candidatos da extensão</div>
            <div className="text-xs text-muted-foreground">{pending} aguardando classificação</div>
          </div>
        </div>
        <Button size="sm" disabled={mut.isPending || pending === 0} onClick={() => mut.mutate()}>
          {mut.isPending ? "Processando…" : "Processar candidatos"}
        </Button>
      </CardContent>
      <RateLimitsEditor />
    </Card>
  );
}

type Limits = { requests_per_minute: number; ads_per_hour: number; ads_per_day: number };

function RateLimitsEditor() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Limits | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", "extension-rate-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_rate_limits")
        .select("requests_per_minute, ads_per_hour, ads_per_day")
        .maybeSingle();
      if (error) throw error;
      return data as Limits | null;
    },
  });
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase
        .from("extension_rate_limits")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Limites salvos");
      qc.invalidateQueries({ queryKey: ["admin", "extension-rate-limits"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  if (!form) return null;
  const field = (k: keyof Limits, label: string) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        min={1}
        className="h-8 w-32"
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: Math.max(1, Number(e.target.value) || 1) })}
      />
    </label>
  );
  return (
    <CardContent className="flex flex-wrap items-end gap-4 border-t border-border/60 p-4">
      <div className="w-full text-xs font-semibold">Limites por código de acesso (máx. 50 anúncios por envio)</div>
      {field("requests_per_minute", "Requisições/min")}
      {field("ads_per_hour", "Anúncios/hora")}
      {field("ads_per_day", "Anúncios/dia")}
      <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>
        Salvar limites
      </Button>
    </CardContent>
  );
}
