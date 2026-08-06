# Mineração travando em ~55 min: diagnóstico e correção

## O que os dados mostram

Da última run (57 min, encerrada pelo watchdog, 0 ofertas gravadas):

- 72 blocos de busca criados, apenas **12 concluídos**; **60 falharam**.
- Motivo das falhas: **`Meta API 400: (#613) Calls to this api have exceeded the rate limit`** — não é lentidão nem tamanho de bloco.
- Cada bloco gasta suas 3 tentativas em poucos minutos e morre; a run fica sem nada para entregar.
- O watchdog (cron a cada 5 min) só marcou a run como `blocked` e não executou finalização; por isso `offers_upserted = 0` mesmo com dados coletados no `meta_refresh_ads_raw`.

Ou seja: aumentar palavras por bloco **piora** (mais chamadas na mesma janela) e diminuir palavras-chave só esconde o problema (você perde cobertura e continua batendo no limite quando crescer de novo).

## Recomendação

Manter as 390 palavras-chave e manter 8 por bloco. O que precisa mudar é **como o motor conversa com a Meta**: respeitar o limite de chamadas, não queimar tentativas quando levar 613, e distribuir a carga ao longo do dia.

## O que será feito

1. **Tratar o erro 613 como "tente mais tarde", não como falha**
   - Ao receber 613, o bloco volta para `pending` com espera progressiva (backoff), sem consumir tentativa.
   - Tentativas só são consumidas em erros reais (token inválido, resposta inválida, etc.).

2. **Throttle global de chamadas à Meta**
   - Intervalo mínimo entre chamadas dentro do bloco e limite de chamadas por ciclo do worker.
   - Após um 613, o worker entra em modo lento por alguns minutos automaticamente.

3. **Paralelismo controlado (2 blocos por ciclo, não 6)**
   - Hoje o worker reclama 6 blocos e processa em série: os 5 restantes ficam "running" e estouram.
   - Passa a reclamar só o que consegue processar, em paralelo real, o que elimina os blocos órfãos.

4. **Rodízio de palavras-chave por run**
   - Cada run cobre uma fatia das palavras (por prioridade e por "há mais tempo sem minerar"), e o cron roda mais vezes ao dia.
   - Resultado: as 390 palavras continuam cobertas em 24h, mas cada run cabe folgada na janela e entrega ofertas em vez de morrer no watchdog.
   - Configurável no painel admin (palavras por run), com valor inicial seguro.

5. **Run parcial nunca mais volta vazia**
   - Se o watchdog encerrar, o que já foi buscado é classificado e gravado (hoje a run morre com `offers_upserted = 0`).

6. **Visibilidade no painel de mineração**
   - A barra de progresso passa a mostrar "aguardando limite da Meta" e quantos blocos estão em espera, separado de blocos com erro real.

## Detalhes técnicos

- `src/routes/api/public/hooks/refresh-worker.ts`: classificar erro 613 (`is_rate_limited`), requeue com backoff, reduzir `JOBS_PER_TICK` para 2 com `Promise.allSettled`, throttle entre chamadas.
- `src/lib/meta-mining.server.ts`: `searchTermPaginated` propaga o código do erro Meta; espaçamento mínimo entre requisições.
- `src/routes/api/public/hooks/refresh-offers.ts`: seleção rotativa de palavras-chave por run (nova coluna `last_mined_at` em `search_keywords`) e finalização parcial.
- Migração: `search_keywords.last_mined_at`, `mining_settings.keywords_per_run`, RPC para devolver job ao estado `pending` com `available_at`.
- Cron: aumentar a frequência das runs (ex.: a cada 6h) já que cada run fica menor.

## Fora de escopo

Nenhuma mudança visual no dashboard, nos filtros ou nas categorias.
