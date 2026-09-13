import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Users } from "lucide-react";
import { ProGate } from "@/components/pro-gate";
import { Button } from "@/components/ui/button";
import { loadQuiz } from "@/lib/quiz-api";
import { downloadLeadsCsv, listQuizLeads } from "@/lib/quiz-leads";
import { maskPhone } from "@/lib/quiz-conversion";

export const Route = createFileRoute("/modelar-quiz/leads/$id")({
  head: () => ({
    meta: [
      { title: "Leads do quiz | Modelads" },
      {
        name: "description",
        content: "Veja e exporte os leads capturados pelos seus quizzes publicados.",
      },
      { property: "og:title", content: "Leads do quiz | Modelads" },
      {
        property: "og:description",
        content: "Veja e exporte os leads capturados pelos seus quizzes publicados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProGate
      icon={Users}
      title="Leads do Quiz"
      description="Contatos capturados pelos seus quizzes publicados."
    >
      <LeadsPage />
    </ProGate>
  ),
});


function LeadsPage() {
  const { id } = Route.useParams();

  const quizQuery = useQuery({ queryKey: ["quiz", id], queryFn: () => loadQuiz(id) });
  const leadsQuery = useQuery({ queryKey: ["quiz-leads", id], queryFn: () => listQuizLeads(id) });

  const leads = leadsQuery.data ?? [];
  const quizName = quizQuery.data?.quiz.name ?? "Quiz";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/modelar-quiz"
            className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para os quizzes
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Leads — {quizName}</h1>
          <p className="text-sm text-muted-foreground">
            Contatos capturados pelas seções de captura deste quiz.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={leads.length === 0}
          onClick={() => downloadLeadsCsv(leads, `leads-${quizName}.csv`)}
        >
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {leadsQuery.isLoading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum lead ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Publique o quiz e compartilhe o link para começar a receber contatos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3">{l.name || "—"}</td>
                  <td className="px-4 py-3">{l.email || "—"}</td>
                  <td className="px-4 py-3">{l.whatsapp ? maskPhone(l.whatsapp) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
