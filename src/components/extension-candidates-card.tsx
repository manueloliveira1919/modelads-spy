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
      toast.success(r.processed ? `${r.processed} candidatos enviados para classificação` : "Nenhum candidato pendente");
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
    </Card>
  );
}
