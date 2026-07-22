import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { ProGate } from "@/components/pro-gate";

export const Route = createFileRoute("/modelar-quiz")({
  head: () => ({
    meta: [
      { title: "Modelar Quiz — Modelads" },
      { name: "description", content: "Crie quizzes de segmentação e conversão modelados em ofertas de sucesso." },
    ],
  }),
  component: () => (
    <ProGate
      icon={HelpCircle}
      title="Modelar Quiz"
      description="Crie quizzes de qualificação e conversão a partir de estruturas testadas."
    />
  ),
});
