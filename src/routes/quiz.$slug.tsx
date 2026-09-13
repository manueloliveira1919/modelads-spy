import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { loadPublicQuiz } from "@/lib/quiz-public";

export const Route = createFileRoute("/quiz/$slug")({
  // Página 100% cliente: o conteúdo vem do banco após a montagem.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quiz interativo | Modelads" },
      {
        name: "description",
        content: "Responda a este quiz rápido e receba um resultado personalizado.",
      },
      { property: "og:title", content: "Quiz interativo | Modelads" },
      {
        property: "og:description",
        content: "Responda a este quiz rápido e receba um resultado personalizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicQuizPage,
  errorComponent: () => <Centered title="Não foi possível carregar este quiz." />,
  notFoundComponent: () => <Centered title="Quiz não encontrado." />,
});

function Centered({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function PublicQuizPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-quiz", slug],
    queryFn: () => loadPublicQuiz(slug),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) return <Centered title="Não foi possível carregar este quiz." />;

  if (!data) {
    return (
      <Centered
        title="Quiz não encontrado"
        subtitle="Este quiz não existe ou ainda não foi publicado."
      />
    );
  }

  return (
    <main className="min-h-[100dvh]">
      <h1 className="sr-only">{data.name}</h1>
      <QuizRunner
        quizId={data.id}
        sections={data.sections}
        settings={data.settings}
        mode="live"
        fullScreen
      />
    </main>
  );
}
