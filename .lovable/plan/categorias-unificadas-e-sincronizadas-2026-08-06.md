# Categorias unificadas e sincronizadas

Hoje as categorias existem em dois lugares desconectados: uma lista fixa no código (usada nos filtros e nas cores dos cards) e a tabela de categorias do admin. Por isso, criar/editar categoria no admin não muda nada nas outras telas. Este plano acaba com a lista fixa: o admin passa a ser a única fonte da verdade.

## 1. As 8 categorias oficiais

Saúde, Finanças, Low Ticket, Relacionamento, Beleza, Fitness, Espiritualidade, Negócios.

- Criar as que faltam (Espiritualidade) e padronizar nome/cor/ícone das existentes.
- Remover as demais categorias do admin (Info, Nutra, Emagrecimento, Diabetes, Cursos, Mentorias, Aplicativos, Ebooks, Low ticket duplicado).
- Conforme sua escolha: apagar as palavras-chave dessas categorias removidas e desativar as ofertas já mineradas nelas (Info 74, Emagrecimento 44, Diabetes 39, Nutra 34, Mentorias 26, Cursos 21).
- Corrigir acentuação nas palavras-chave restantes ("Saude" → "Saúde", "Financas" → "Finanças", "Negocios" → "Negócios") para não sobrar categoria órfã.

## 2. Sincronização real em todo o app

- Filtro de **Ofertas do Dia** passa a listar as 8 categorias vindas do banco (inclui Low Ticket), em vez da lista fixa.
- **Palavras-chave** (select do formulário, import/export CSV, agrupamento) usa a mesma lista.
- **Mineração** (seletor "Minerar apenas X") usa a mesma lista.
- **Cores e ícones dos cards de oferta** passam a vir da cor/ícone cadastrados no admin — editar a cor no admin muda o badge na hora.
- Ao criar uma categoria nova no admin, ela aparece automaticamente em todos esses pontos, sem alteração de código.
- Ao renomear uma categoria, as palavras-chave e ofertas ligadas a ela são renomeadas junto (nada fica órfão).
- Excluir categoria com palavras-chave vinculadas passa a avisar quantas serão afetadas antes de confirmar.

## 3. Detalhes técnicos

- Novo hook/queries compartilhados (`useCategories`) lendo `keyword_categories` ativas, com cache do React Query e invalidação após qualquer alteração no admin.
- `CATEGORIES` e `CATEGORY_STYLES` fixos em `src/lib/offers-shape.ts` / `src/components/offer-card.tsx` deixam de definir a lista; o tipo `OfferCategory` vira `string` e a cor é derivada do hex cadastrado (fallback neutro quando ausente).
- `src/lib/mining-config.server.ts` continua sendo a fonte no servidor; a normalização sem acento já existente garante que "Saude"/"Saúde" caiam na mesma categoria.
- Limpeza de dados aplicada por migração/atualização de dados no banco (renomear, apagar palavras-chave, desativar ofertas).

## 4. Tempo estimado da mineração (400 palavras-chave)

Cada bloco processa 8 palavras-chave → 400 palavras ≈ 50 blocos de busca (os 72 blocos que você viu incluíam também snapshot/classificação).

- Cada palavra leva ~40 s na Meta (com paginação), logo **um bloco de 8 palavras ≈ 5 a 6 minutos**.
- O worker roda a cada minuto e hoje processa os blocos em série, terminando ~1 bloco por invocação: **50 blocos ≈ 50–60 minutos só na fase de busca**, mais snapshots e classificação — perto ou acima do limite de 55 min do watchdog.

Não incluí a correção desse gargalo aqui (é mudança no motor de mineração, fora do escopo de categorias). Se quiser, faço em seguida a paralelização dos blocos, que derruba esse tempo para algo em torno de 10–15 minutos.
