## 1. Menu lateral do Admin no celular

Hoje o `AdminShell` só mostra a barra lateral em telas grandes (`hidden lg:flex`) e não existe nenhum botão de menu — por isso no celular não aparecem as outras ferramentas do painel.

Mudança:
- Adicionar um cabeçalho fixo no topo do admin em telas pequenas com o logo Modelads/Admin e um botão hambúrguer (3 linhas).
- O botão abre um painel deslizante com a mesma lista de navegação (Dashboard, Clientes, Mineração, Palavras-chave, Blacklist, Categorias, Qualidade, Logs, Suporte, Configurações) e o link "Voltar ao app".
- Fecha ao tocar fora, no X, ou ao escolher um item. Item ativo destacado igual ao desktop.
- No desktop nada muda.

## 2. Auditoria das ferramentas do painel Admin

Vou testar página por página (leitura, criação, edição, exclusão e permissões) e devolver um relatório curto dizendo o que está funcional, o que está parcial e o que é só visual:

| Página | O que será verificado |
|---|---|
| Dashboard | Contadores de clientes, planos e ofertas ativas |
| Clientes | Listagem, troca de plano, suspensão |
| Mineração | Disparo manual, histórico de execuções, métricas |
| Palavras-chave | CRUD e uso real pelo minerador |
| Blacklist | CRUD, import/export CSV, aplicação na mineração |
| Categorias | CRUD e reflexo nos filtros |
| Qualidade | Métricas dos últimos 30 dias |
| Logs | Registro de ações e erros |
| Suporte | Hoje é uma tabela vazia sem fonte de dados |
| Configurações | Salvamento das configurações globais |

Nenhuma correção será feita nesta etapa sem você aprovar — entrego o diagnóstico com o que precisa ser conectado (ex.: Suporte precisa de tabela de chamados) e você decide.

## 3. Remover "Atualizar Ofertas" do dashboard do cliente

Na página de ofertas do cliente (`/ofertas-do-dia`), remover o botão "Atualizar Ofertas" e todo o código de disparo da mineração ligado a ele, mantendo intactos a lupa de busca e os filtros. A mineração manual continua disponível apenas no painel admin.

### Detalhes técnicos
- `src/components/admin-shell.tsx`: adicionar estado de abertura, header mobile e drawer reutilizando o array `NAV`.
- `src/routes/ofertas-do-dia.tsx`: remover o botão, o estado `refreshing` e o `fetch` para `/api/public/hooks/refresh-offers`.
- Auditoria: leitura dos arquivos `src/routes/admin.*.tsx` + consultas de leitura ao banco para conferir tabelas, políticas e dados.
