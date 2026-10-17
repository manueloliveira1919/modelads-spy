import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generatePendingPreviews } from "@/lib/offer-previews.functions";

export function OfferPreviewsAdmin() {
  const generate = useServerFn(generatePendingPreviews);
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ["admin", "offer-previews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offer_previews").select("status,attempts");
      if (error) throw error;
      return {
        ready: (data ?? []).filter((row) => row.status === "ok").length,
        failed: (data ?? []).filter((row) => row.status === "failed").length,
        exhausted: (data ?? []).filter((row) => row.status !== "ok" && row.attempts === 3).length,
      };
    },
  });
  const mutation = useMutation({
    mutationFn: () => generate(),
    onSuccess: (result) => {
      if (!result.ok) toast.error(result.message);
      else toast.success(`${result.saved} capas salvas · ${result.failed} falhas · ${result.processed} ofertas processadas`);
      void qc.invalidateQueries({ queryKey: ["admin", "offer-previews"] });
      void qc.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: () => toast.error("Não foi possível gerar as capas. Confira sua sessão e tente novamente."),
  });
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
      <div>
        <h2 className="font-display text-base font-semibold">Capas da Vitrine</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.data?.ready ?? 0} prontas · {stats.data?.failed ?? 0} falhas · {stats.data?.exhausted ?? 0} com tentativas esgotadas
        </p>
        {mutation.data?.ok === false && <p className="mt-2 max-w-xl text-sm text-destructive">{mutation.data.message}</p>}
      </div>
      <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="gap-2">
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        {mutation.isPending ? "Gerando capas..." : "Gerar previews pendentes"}
      </Button>
    </div>
  );
}