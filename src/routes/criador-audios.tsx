import { createFileRoute } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/criador-audios")({
  head: () => ({
    meta: [
      { title: "Criador de Áudios — Modelads" },
      { name: "description", content: "Gere áudios e VOs de anúncio com IA em vozes brasileiras." },
    ],
  }),
  component: () => (
    <ProGate
      icon={Mic}
      title="Criador de Áudios"
      description="Gere áudios, VOs e trilhas com IA em vozes brasileiras naturais."
    />
  ),
});
