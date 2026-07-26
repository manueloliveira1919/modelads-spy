import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Modelads" },
      {
        name: "description",
        content: "Como o Modelads coleta, usa e protege os dados dos usuários.",
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

        <h1 className="font-display text-2xl font-bold">Política de Privacidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: 26 de julho de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">1. Quem somos</h2>
            <p>
              O Modelads ("nós", "plataforma") é uma ferramenta que reúne anúncios públicos
              veiculados na Meta Ad Library (Facebook/Instagram) para ajudar usuários a
              pesquisar e se inspirar em ofertas que já estão em circulação. Esta política
              explica quais dados coletamos de você, usuário da plataforma, e como os usamos.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">2. Quais dados coletamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Dados de conta:</strong> nome, e-mail e senha (armazenada de forma criptografada), fornecidos no cadastro.</li>
              <li><strong className="text-foreground">Dados de uso:</strong> ofertas favoritadas, ferramentas utilizadas e plano de assinatura, para o funcionamento do produto.</li>
              <li><strong className="text-foreground">Dados técnicos:</strong> endereço IP e informações de navegador, coletados automaticamente por questões de segurança e para diagnosticar problemas.</li>
            </ul>
            <p className="mt-2">
              Não coletamos dados de pagamento diretamente — pagamentos são processados por
              provedores externos, que possuem suas próprias políticas de privacidade.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">3. Sobre os anúncios exibidos na plataforma</h2>
            <p>
              As ofertas e anúncios exibidos no Modelads são informações públicas, obtidas
              através da API oficial da Meta Ad Library. Esses dados pertencem aos
              anunciantes e páginas que os publicaram — não coletamos nem armazenamos dados
              pessoais de terceiros além do que já é público na própria Meta Ad Library.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">4. Como usamos seus dados</h2>
            <p>
              Usamos seus dados para: (a) manter sua conta e suas preferências funcionando;
              (b) enviar comunicações sobre sua conta ou o serviço; (c) melhorar a plataforma;
              (d) cumprir obrigações legais quando aplicável. Não vendemos seus dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">5. Compartilhamento com terceiros</h2>
            <p>
              Utilizamos provedores de infraestrutura (como Supabase, para banco de dados, e
              Vercel, para hospedagem) que processam dados em nosso nome, sob suas próprias
              obrigações de segurança e confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">6. Seus direitos</h2>
            <p>
              Você pode solicitar a qualquer momento a exclusão da sua conta e dos dados
              associados a ela. Veja como em nossa{" "}
              <Link to="/exclusao-de-dados" className="text-brand hover:underline">
                página de Exclusão de Dados
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 font-display text-base font-bold text-foreground">7. Contato</h2>
            <p>
              Dúvidas sobre privacidade podem ser enviadas para{" "}
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
