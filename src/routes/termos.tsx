import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Serviço — Modelads" },
      {
        name: "description",
        content: "Regras de uso da plataforma Modelads.",
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

        <h1 className="font-display text-2xl font-bold">Termos de Serviço</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: 26 de julho de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">1. Aceitação dos termos</h2>
            <p>
              Ao criar uma conta ou usar o Modelads, você concorda com estes Termos de
              Serviço. Se não concordar, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">2. O que é o Modelads</h2>
            <p>
              O Modelads é uma ferramenta de pesquisa que reúne, organiza e classifica
              anúncios publicamente disponíveis na Meta Ad Library, com o objetivo de ajudar
              usuários a estudar estratégias de anúncios já em circulação. O Modelads não cria,
              não publica e não gerencia anúncios em nome do usuário.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">3. Contas e planos</h2>
            <p>
              Algumas funcionalidades exigem uma conta e/ou uma assinatura paga. Planos,
              limites de uso e valores podem ser alterados a qualquer momento, com aviso
              razoável aos usuários ativos.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">4. Uso aceitável</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Não utilize a plataforma para fins ilegais ou para infringir direitos de terceiros.</li>
              <li>Não tente extrair em massa (scraping) os dados da plataforma fora das funcionalidades oferecidas.</li>
              <li>Não compartilhe sua conta com terceiros de forma que viole os limites do seu plano.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">5. Conteúdo de terceiros</h2>
            <p>
              As ofertas exibidas pertencem aos respectivos anunciantes. O Modelads não se
              responsabiliza pela veracidade, legalidade ou resultado de qualquer anúncio ou
              oferta exibida na plataforma — o uso dessas informações é de responsabilidade
              exclusiva do usuário.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">6. Limitação de responsabilidade</h2>
            <p>
              A plataforma é fornecida "como está". Não garantimos disponibilidade
              ininterrupta nem resultados de negócio a partir do uso das informações
              disponibilizadas.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">7. Alterações</h2>
            <p>
              Podemos atualizar estes termos periodicamente. Alterações relevantes serão
              comunicadas por e-mail ou dentro da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">8. Contato</h2>
            <p>
              Dúvidas sobre estes termos:{" "}
              <a href="mailto:contato@modelads.com.br" className="text-brand hover:underline">
                contato@modelads.com.br
              </a>{" "}
              (troque pelo seu e-mail real de suporte).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
