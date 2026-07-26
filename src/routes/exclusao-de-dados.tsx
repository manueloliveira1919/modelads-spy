import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/exclusao-de-dados")({
  head: () => ({
    meta: [
      { title: "Exclusão de Dados — Modelads" },
      {
        name: "description",
        content: "Como solicitar a exclusão dos seus dados no Modelads.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para o Modelads
        </Link>

        <div className="mb-8 flex items-center gap-2">
          <Gem className="h-5 w-5 text-brand" />
          <span className="font-display text-lg font-bold">Modelads</span>
        </div>

        <h1 className="font-display text-2xl font-bold">Exclusão de Dados do Usuário</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: 26 de julho de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <p>
              Você pode solicitar a exclusão permanente da sua conta e de todos os dados
              pessoais associados a ela (nome, e-mail, favoritos e histórico de uso) a
              qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">Como solicitar</h2>
            <p>
              Envie um e-mail para{" "}
              <a href="mailto:contato@modelads.com.br" className="inline-flex items-center gap-1 text-brand hover:underline">
                <Mail className="h-3.5 w-3.5" /> contato@modelads.com.br
              </a>{" "}
              a partir do endereço de e-mail cadastrado na sua conta, com o assunto
              "Exclusão de dados". Vamos confirmar o pedido e processar a exclusão em até
              15 dias corridos.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">O que é excluído</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Seu cadastro (nome, e-mail, senha).</li>
              <li>Suas ofertas favoritadas e histórico de uso das ferramentas.</li>
              <li>Registros de assinatura/plano associados à sua conta.</li>
            </ul>
            <p className="mt-2">
              Registros que precisamos manter por obrigação legal ou fiscal (como notas de
              cobrança, quando aplicável) podem ser retidos pelo prazo exigido por lei.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
