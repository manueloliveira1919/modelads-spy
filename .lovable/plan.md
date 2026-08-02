## Escopo desta etapa

Só o **sistema de suporte (tickets)** — que é a única parte realmente incompleta hoje. Os outros itens da sua lista (Minha assinatura, histórico de pagamentos, limites por plano, barra de progresso, notificações, tutorial) ficam para etapas seguintes, cada uma em seu próprio pedido, para não gastar créditos à toa.

O que já existe: a tabela `support_tickets` (nome, email, assunto, mensagem, status) e a tela `/admin/suporte` — mas ela é 100% visual, sem consulta ao banco, sem respostas e sem formulário no lado do cliente.

## 1. Banco de dados

- Nova tabela `support_ticket_messages`: `ticket_id`, `author_id`, `is_admin`, `body`, `attachment_path`, `created_at` — guarda a conversa (mensagem inicial do cliente + respostas do admin).
- Adicionar em `support_tickets`: `attachment_path` (imagem anexada na abertura) e `last_message_at` (para ordenar por atividade).
- Bucket de arquivos privado `support-attachments`, com upload em `{user_id}/{ticket_id}/arquivo` — só o dono e o admin conseguem ler; a imagem é exibida por link temporário assinado.
- Permissões: cliente lê/escreve apenas nos próprios chamados; admin lê e responde todos e altera o status.

## 2. Área do cliente — `/suporte`

Novo item "Suporte" no menu lateral, seção **Conta**.

- Lista dos meus chamados: assunto, status colorido (Aberto / Em andamento / Resolvido) e data da última atividade.
- Botão **Abrir chamado** → formulário com **Assunto**, **Mensagem** e **Anexar imagem** (opcional, PNG/JPG/WebP, até 5 MB). Validação com Zod, limites de tamanho de texto e feedback com toast.
- Ao clicar num chamado: conversa completa, imagem anexada e caixa para enviar nova mensagem (bloqueada quando o chamado está Resolvido, com botão "Reabrir").
- Nome e e-mail vêm do perfil logado — o cliente não precisa digitar.

## 3. Área do admin — `/admin/suporte`

Substitui a tabela estática por dados reais.

- Lista de chamados com filtro por status e busca por assunto/e-mail; contadores no topo (abertos / em andamento / resolvidos).
- Ao abrir um chamado: dados do cliente, histórico da conversa, anexo visível e **campo de resposta**.
- Seletor de status (Aberto → Em andamento → Resolvido), gravando a ação nos logs do admin (`admin-log`).
- Badge com a quantidade de chamados abertos no item "Suporte" do menu do admin.

## Detalhes técnicos

- Migração criando `support_ticket_messages` (+ colunas novas em `support_tickets`) com `GRANT` e políticas RLS por dono/admin; bucket privado criado pela ferramenta de storage e políticas em `storage.objects`.
- Leituras e escritas via `createServerFn` com `requireSupabaseAuth` em `src/lib/support.functions.ts` (listar meus chamados, criar chamado, listar mensagens, responder) e funções de admin que checam `has_role(auth.uid(),'admin')` antes de qualquer coisa.
- Rotas novas: `src/routes/_authenticated`-equivalente atual do projeto — `src/routes/suporte.tsx` com `RequireAuth`, seguindo o padrão já usado em `/minha-conta`.
- `src/routes/admin.suporte.tsx` reescrito com TanStack Query (`useQuery`/`useMutation` + invalidação).
- Upload da imagem direto pelo cliente Supabase do browser para o bucket privado; exibição via URL assinada gerada no servidor.
- Nada da mineração, dos filtros ou do restante do app é alterado.
