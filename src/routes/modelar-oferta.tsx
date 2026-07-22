import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/modelar-oferta")({
  head: () => ({
    meta: [
      { title: "Modelar Oferta — Modelads" },
      { name: "description", content: "Gere copy e estrutura de ofertas vencedoras a partir de referências reais." },
    ],
  }),
  component: () => (
    <ProGate
      icon={FileText}
      title="Modelar Oferta"
      description="Gere copy, headlines e estrutura completa de ofertas a partir de referências vencedoras."
    />
  ),
});
