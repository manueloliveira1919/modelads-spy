import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/modela-spy-ai")({
  head: () => ({
    meta: [
      { title: "Modela Spy AI — Modelads" },
      { name: "description", content: "Espionagem inteligente com IA para descobrir padrões vencedores em ofertas." },
    ],
  }),
  component: () => (
    <ProGate
      icon={Bot}
      title="Modela Spy AI"
      description="Espionagem inteligente com IA que analisa criativos, copy e estrutura das ofertas vencedoras."
    />
  ),
});
