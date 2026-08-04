# Qualificação da mineração: novo status, categorias por relevância e blacklist obrigatória

Escopo: apenas a inteligência de classificação dos anúncios. Fila, autenticação, planos e telas existentes permanecem como estão (única exceção necessária: exibir o novo status "Escalando", detalhada abaixo).

## 1. Status por tempo de campanha

Hoje o status é definido só pela quantidade de anúncios ativos da página (10+ = Escaladíssima). Isso explica a distribuição atual: 545 Testando, 89 Escaladíssima, 36 Crescendo.

Nova regra, baseada em dias ativos:

| Status | Dias ativos |
|---|---|
| Testando | 1 a 3 |
| Crescendo | 4 a 7 |
| Escalando | 8 a 15 |
| Escaladíssima | 16 ou mais |

- Volume de criativos vira fator secundário: pode **subir** um nível apenas quando a campanha já tem 8+ dias e a página mantém 10+ anúncios ativos. Nunca cria Escalando/Escaladíssima abaixo de 4 dias.
- Ofertas já existentes no banco são reclassificadas com a nova regra (é o que gera o "antes e depois" do relatório).

**Ponto que exige um ajuste mínimo de tela:** "Escalando" é um status novo. Sem tocar em nada, ele apareceria como rótulo desconhecido nos cards e sumiria dos filtros. A alteração fica restrita a: incluir o valor no tipo, dar a ele um selo (mesmo estilo dos atuais, tom intermediário entre Crescendo e Escaladíssima) e incluí-lo no filtro de escala. Nenhum redesenho.

## 2. Produtos físicos e materiais de conteúdo

O detector de tipo de produto ganha os termos pedidos:

- Físico: encapsulado(s), cápsula(s)/capsula(s), suplemento(s), chá/chas, fórmula natural, gotas, extrato, comprimido(s).
- Conteúdo (Ebook/PDF): receita(s), cardápio/cardapio, protocolo, plano alimentar.

A ordem de checagem passa a testar "físico" antes de "curso", para que "suplemento com acompanhamento" não caia em Curso Online.

## 3. Categoria por relevância no texto, não pela palavra pesquisada

Hoje a categoria vem direto do termo pesquisado — por isso "Conheça o novo dorama coreano" entra como Info quando encontrado pela palavra "método".

Nova sequência:

1. Encontra o anúncio (sem mudança).
2. Junta todo o texto disponível: nome da página, título, corpo, descrição e o link de destino.
3. Compara com o vocabulário da categoria (as palavras-chave ativas daquela categoria, já cadastradas no admin).
4. Pontua as correspondências distintas:
   - 1 correspondência: descarta (baixa relevância);
   - 2: aceita apenas se houver outro sinal forte (preço no texto, link de destino próprio ou 4+ dias ativos);
   - 3 ou mais: aprova.
5. Se o texto pontuar mais alto em outra categoria que na categoria do termo pesquisado, a oferta é gravada na categoria de maior pontuação.

Também corrijo aqui um problema encontrado no banco: as categorias cadastradas usam acento ("Saúde", "Finanças", "Negócios") enquanto as palavras-chave usam versões sem acento ("Saude", "Financas", "Negocios"), e existe uma categoria com o nome digitado errado ("Infro"). Como o classificador só aceita categoria que exista na lista ativa, boa parte dos anúncios está sendo descartada por isso. A comparação passa a ignorar acento, maiúsculas e espaços.

## 4. Regra extra para "Info"

Palavras genéricas (método, história, segredo, guia, manual, sistema, conteúdo, resultado, fórmula) passam a valer peso baixo: sozinhas não somam pontuação suficiente. Um anúncio só entra em Info com pelo menos 3 correspondências de vocabulário específico do nicho — genéricas não contam para esse mínimo.

## 5. Blacklist obrigatória

As três listas (streaming/filmes, cassino/apostas, jogos) são inseridas na tabela de blacklist como bloqueio absoluto, aplicado antes de qualquer classificação — texto, nome da página e domínio de destino. Termos como "bet", "cassino" e "aposta" entram como palavra inteira, para não bloquear por engano palavras que os contenham.

Ofertas já gravadas que batem nessas listas são desativadas na mesma passagem.

## 6. Relatório de auditoria

Ao final, entrego um relatório com:

- contagem por status (Testando, Crescendo, Escalando, Escaladíssima) antes e depois;
- quantos registros existentes foram bloqueados pela nova blacklist;
- quantos foram desativados por baixa relevância de categoria;
- exemplos reais de anúncios com a classificação antiga e a nova.

Nas execuções seguintes, esses mesmos números passam a ficar registrados por execução, aparecendo no painel de progresso que já existe.

## Detalhes técnicos

- `src/lib/offer-heuristics.ts`: `classifyStatus(activeDays, activeAdsCount)` com a nova tabela e o bônus condicional; `inferProductType` com o vocabulário novo e reordenação das checagens; novo tipo `"escalando"`.
- Novo `src/lib/category-scoring.ts` (puro, sem I/O): normalização sem acento, vocabulário por categoria, pesos, lista de termos genéricos de Info e função de pontuação retornando `{ category, score, matches }`.
- `src/lib/mining-config.server.ts`: `loadActiveCategories` passa a devolver o mapa nome normalizado → nome canônico; nova `loadCategoryVocabulary()` agrupando `search_keywords` ativas por categoria.
- `src/routes/api/public/hooks/refresh-worker.ts` (`processClassifyJob`): aplica pontuação de categoria antes do upsert, inclui o link no texto avaliado, novo contador `low_relevance` no `discard_breakdown` e `status` calculado por `active_days`.
- `src/components/mining-progress.tsx`: exibe o novo motivo de descarte "Baixa relevância".
- `src/lib/offers-shape.ts`, `src/components/offer-card.tsx`, `src/routes/index.tsx`, filtros de escala: acrescentar o valor `escalando` (selo e opção de filtro), sem alterar layout.
- Dados: inserção dos termos de blacklist (`blacklist_words`), normalização dos nomes de categoria com acento/erro de digitação, recálculo de `status` das ofertas ativas e desativação das que batem na nova blacklist — tudo via alterações de dados, sem mudança de esquema.
