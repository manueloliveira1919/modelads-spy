# Mineração: acelerar, mostrar progresso e minerar por categoria

## Diagnóstico (confirmado no banco)

A execução não está com erro — está apenas muito maior que antes:

- Palavras-chave ativas: **573** (antes ~73).
- Lotes de 8 palavras → **72 tarefas de busca**.
- O processador roda 1 vez por minuto e pega **3 tarefas** por vez.
- Resultado: ~24 min só na busca + classificação/gravação → 25–35 min no total.

Nenhuma tarefa falhou e não houve erro da API da Meta nesta execução.

## Passo 1 — Dobrar a velocidade do processamento

- Passar de **3 para 6 tarefas por ciclo** (1 ciclo por minuto).
- Tempo esperado da mineração completa: **10–15 minutos**.
- Sem subir mais que isso agora, para não arriscar bloqueio temporário da API da Meta.

## Passo 2 — Barra de progresso na tela de Mineração (admin)

Enquanto houver execução em andamento, o painel passa a mostrar, com atualização automática a cada ~5s:

- Fase atual, em sequência: **Buscando anúncios → Classificando → Salvando ofertas → Finalizando**.
- Barra de progresso com contador real: "Buscando anúncios: 29/72".
- **Tempo decorrido** e **tempo restante estimado** (baseado no ritmo real das tarefas já concluídas).
- **Anúncios encontrados**, **aprovados** e **descartados pela blacklist** (e demais motivos de descarte já registrados: idioma, categoria, duplicado).

O Dashboard do admin ganha o mesmo resumo em formato compacto: palavras ativas, tarefas concluídas, tempo restante, encontrados / aprovados / descartados.

## Passo 3 — Minerar por categoria

No painel de Mineração, um seletor antes de executar:

- Minerar todas
- Minerar apenas uma categoria (Emagrecimento, Saúde, Marketing, Finanças, Beleza… lista vinda das categorias cadastradas)

Quando uma categoria é escolhida, só as palavras daquela categoria entram na fila — menos tarefas, execução mais curta e ofertas mais focadas. A categoria escolhida fica registrada no histórico de execuções.

Observação: a distribuição sugerida (100 palavras por categoria) é de conteúdo, não de código — dá para ajustar na tela de Palavras-chave desativando o excedente, sem perder nada.

## Segurança da mudança (respostas às suas dúvidas)

**Quebra a mineração que está rodando agora?** Não. A fila de tarefas fica no banco; alterar o código não apaga nem reinicia nada. Além disso, o processador que roda hoje é o do site publicado — as alterações só passam a valer depois de publicar. Ainda assim, o mais tranquilo é **aprovar agora e publicar depois que a execução atual terminar**, para o efeito da mudança ficar limpo de medir.

**Aumentar para 6 é arriscado de bloqueio?** É um risco baixo. Cada ciclo passa de 3 para 6 tarefas por minuto — em pico, algo como 6 a 12 chamadas por minuto à API da Meta, bem abaixo dos limites normais de um app. O que costuma gerar bloqueio é rajada alta e contínua (20+ por minuto), não esse patamar.

**Plano de segurança embutido:**
- Se a Meta responder com erro de limite (código 4 / 17 / 613), a tarefa é reenfileirada e aguarda o ciclo seguinte, em vez de ser descartada — já existe o vigia que devolve tarefas presas para a fila.
- Os erros de API por execução continuam registrados; se aparecerem erros de limite, basta voltar para 4 ou 3 num ajuste de uma linha.
- Nada de subir para 10 ou 15 agora.

**Sugestão de ordem:** aprovar o plano completo, aplicar Passo 1 + Passo 2 juntos e publicar após o fim da execução atual; na execução seguinte você já vê a barra de progresso e o tempo real. O Passo 3 (minerar por categoria) entra na sequência, sem depender dos outros.

## Detalhes técnicos

- **Passo 1**: `JOBS_PER_TICK` de 3 → 6 em `src/routes/api/public/hooks/refresh-worker.ts` (o `claim_refresh_jobs` já recebe o limite por parâmetro; nada muda no banco).
- **Passo 2**:
  - Nova função de banco (SECURITY DEFINER, só admin) que devolve, por `run_id`: total/concluídas/pendentes por `kind`, e os agregados de encontrados/aprovados/descartados a partir de `mining_logs`. Necessária porque `meta_refresh_jobs` não é legível pelo cliente.
  - `src/routes/admin.mineracao.tsx`: novo bloco de progresso (`Progress` do shadcn), fases derivadas de `meta_refresh_runs.phase` + fila, ETA calculado no cliente, `refetchInterval` de 5s só enquanto `status = running`.
  - Garantir que o worker grave o breakdown de descarte por execução (já existe `discard_breakdown` nos logs de job) para os contadores somarem corretamente.
  - `src/routes/admin.index.tsx`: cards de resumo lendo a mesma função.
- **Passo 3**:
  - `mining_create_run`/fluxo do enfileirador passa a aceitar um filtro opcional de categoria; `buildSearchPlan` em `src/lib/mining-config.server.ts` ganha o parâmetro e `loadActiveKeywords` filtra por `category`.
  - `POST /api/public/hooks/refresh-offers` aceita `{ "category": "..." }` no corpo (opcional); o cron continua chamando sem categoria = todas.
  - Categoria selecionada salva em `meta_refresh_runs.details` e exibida no histórico.
- Nenhuma regra de classificação, blacklist ou qualidade é alterada.
