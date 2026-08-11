# Ajuste cirúrgico da qualificação de ofertas

Alteração restrita à camada de classificação. Coleta, fila, worker, cron, execução manual, Central de Mineração, palavras-chave e categorias permanecem intactos.

## 1. Novos critérios de status

Três status apenas, com os dois critérios exigidos ao mesmo tempo (AND):

| Status | Dias ativos | Anúncios ativos |
|---|---|---|
| Testando | 5+ | 10+ |
| Escalado | 20+ | 20+ |
| Escaladíssimo | 30+ | 30+ |

Avaliação do maior para o menor: 30/30 → Escaladíssimo; senão 20/20 → Escalado; senão 5/10 → Testando.

Abaixo de 5 dias ou 10 anúncios: a oferta continua sendo salva (histórico preservado), mas entra como inativa, portanto não aparece no dashboard. Se em uma mineração posterior ela atingir o mínimo, volta a ficar visível normalmente.

O status "Crescendo" (e o rótulo "Escalando") sai da interface: filtros, selos e contadores passam a usar apenas os três status. Os registros já salvos são remapeados pelos novos critérios.

Nomes exibidos: **Testando**, **Escalado**, **Escaladíssimo**.

## 2. Volume de anúncios sem teto

Não há limite superior: 30, 100, 500+ são gravados como vêm da Meta. O número real continua em `active_ads_count`, e a ordenação passa a considerá-lo como desempate dentro do mesmo status (mais anúncios primeiro) — sem nenhuma mudança de layout nesta etapa.

## 3. Validação de pertinência da categoria

Hoje um anúncio pode entrar em Saúde/Finanças/etc. com poucas correspondências. Passa a haver uma verificação de conteúdo antes de salvar:

- A categoria é confirmada pelo texto real do anúncio (nome da página, título, corpo, descrição e link de destino), não pelo termo pesquisado. O termo continua servindo apenas como desempate.
- Exige-se relevância consistente: pelo menos duas correspondências específicas da categoria; uma só correspondência não aprova mais, mesmo com preço no criativo.
- Nova checagem de incompatibilidade temática: anúncios cujo conteúdo é dominado por entretenimento/streaming (filmes, séries, doramas, novelas, IPTV, TV/canais, apps de assistir, animes, futebol ao vivo, "catálogo completo", "todos os episódios", plataformas conhecidas) são reprovados mesmo quando pontuam em alguma categoria — porque o sinal de entretenimento supera o sinal da categoria. Contabilizados como descarte no painel.
- A blacklist atual continua rodando antes de tudo, sem alteração de conteúdo.

## 4. Aplicação ao que já está salvo

Depois da correção publicada, recalculo em lote sobre as ofertas existentes:

- status recalculado pelas novas regras;
- ofertas abaixo do mínimo marcadas como inativas;
- ofertas com conteúdo de entretenimento/streaming desativadas;
- relatório com contagem antes/depois por status e quantas foram desativadas por incompatibilidade.

Nenhuma palavra-chave, categoria ou dado é apagado — só o status e a marcação de ativo/inativo mudam.

## Detalhes técnicos

- `src/lib/offer-heuristics.ts`: `classifyStatus(activeDays, activeAds)` reescrita com os limiares AND, retornando `"testando" | "escalado" | "escaladissimo"`; nova função `meetsMinimumScale(activeDays, activeAds)` para o corte de visibilidade.
- `src/lib/category-scoring.ts`: `pickCategory` passa a exigir `strongMatches >= 2` (remove a exceção de 1 match com preço) e ganha `isEntertainmentNoise(text)` aplicada antes de aceitar a categoria.
- `src/routes/api/public/hooks/refresh-worker.ts`: apenas duas linhas na montagem do upsert — `status: classifyStatus(...)` já existente e `is_active: meetsMinimumScale(...)`; novo contador `entertainment` no `discard_breakdown`. Nada de fila, retries ou timeouts é tocado.
- `src/lib/offers-shape.ts`: `OfferStatus` passa a `"escaladissimo" | "escalado" | "testando"`, com mapeamento de valores legados (`crescendo`/`escalando`/`escaladissima`) na leitura, evitando quebra de dados antigos.
- `src/components/offer-card.tsx`, `src/routes/index.tsx`, `src/routes/ofertas.tsx`, `src/routes/ofertas-do-dia.tsx`, `src/routes/oferta.$id.tsx`, `src/routes/buscar.tsx`: ajuste dos rótulos/filtros para os três status e ordenação secundária por `active_ads_count`.
- `src/components/mining-progress.tsx`: exibe o novo motivo de descarte.
- Dados: um único `UPDATE` de recálculo de `status` e `is_active` em `meta_offers` e desativação das incompatíveis — sem migration de esquema, sem DELETE.

## Verificação antes de concluir

Typecheck, carregamento da Central de Mineração, execução manual de uma mineração pequena com jobs sendo processados, cron e worker inalterados, e contagem de palavras-chave/categorias idêntica antes e depois.
