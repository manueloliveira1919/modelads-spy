import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/criador-criativos")({
  head: () => ({
    meta: [
      { title: "Criador de Criativos — Modelads" },
      { name: "description", content: "Gere criativos de anúncio com IA modelados em campanhas vencedoras." },
    ],
  }),
  component: () => (
    <ProGate
      icon={ImageIcon}
      title="Criador de Criativos"
      description="Gere imagens e vídeos de anúncio automaticamente com IA a partir da sua oferta."
    />
  ),
});
