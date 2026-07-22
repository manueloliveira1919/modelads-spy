import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/modelar-whatsapp")({
  head: () => ({
    meta: [
      { title: "Modelar Funil WhatsApp — Modelads" },
      { name: "description", content: "Crie fluxos de venda no WhatsApp modelados em funis vencedores." },
    ],
  }),
  component: () => (
    <ProGate
      icon={MessageCircle}
      title="Modelar Funil WhatsApp"
      description="Gere fluxos completos de conversão no WhatsApp com base em ofertas escaladas."
    />
  ),
});
