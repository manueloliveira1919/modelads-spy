import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getPublishedPage } from "@/lib/sales-page-api";
import { buildPageHtml } from "@/lib/sales-page-export";

export const Route = createFileRoute("/p/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Página de vendas — Modelads" },
      { name: "description", content: "Conheça o material e a oferta nesta página de vendas publicada no Modelads." },
      { property: "og:title", content: "Página de vendas — Modelads" },
      { property: "og:description", content: "Conheça o material e a oferta nesta página de vendas publicada no Modelads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["public-page", slug], queryFn: () => getPublishedPage(slug), retry: false });

  useEffect(() => {
    if (data) document.title = data.settings.seo.title || data.name;
  }, [data]);

  if (isLoading)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (isError || !data)
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center text-foreground">
        <h1 className="text-lg font-semibold">Página não encontrada.</h1>
      </div>
    );

  // A página roda isolada (sandbox sem mesma origem): pixels e scripts do cliente
  // funcionam, mas não acessam a sessão do Modelads.
  return (
    <iframe
      title={data.name}
      srcDoc={buildPageHtml(data.name, data.settings, data.sections)}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
      className="fixed inset-0 h-[100dvh] w-full border-0"
    />
  );
}
