import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/criador-vsl")({
  head: () => ({
    meta: [
      { title: "Criador de VSL — Modelads" },
      { name: "description", content: "Gere VSLs completas com IA a partir de scripts modelados em ofertas vencedoras." },
    ],
  }),
  component: () => (
    <ProGate
      icon={Video}
      title="Criador de VSL"
      description="Gere VSLs completas com IA a partir de scripts baseados em ofertas escaladas."
    />
  ),
});
