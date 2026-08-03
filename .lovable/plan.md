# Por que a mineração está demorando

## Diagnóstico (verificado agora no banco)

A execução atual (iniciada às 18:59) **não travou** — ela está progredindo normalmente, só que é muito maior que as anteriores:

- Palavras-chave ativas hoje: **573** (depois da importação em massa por CSV).
- O enfileirador divide em lotes de 8 palavras → **72 tarefas de busca**.
- Situação às 19:10: 29 concluídas, 4 em execução, 39 pendentes.
- O processador roda **1 vez por minuto** e pega no máximo **3 tarefas por vez**.

Ou seja: 72 ÷ 3 = ~24 minutos só na fase de busca, mais a fase de classificação/gravação. As execuções anteriores tinham só 10 tarefas de busca (~8 min no total), por isso a média antiga de 8–12 minutos não vale mais.

Não há erro: nenhuma tarefa falhou, nenhum erro de API da Meta registrado, e há um vigia que reenfileira tarefas presas há mais de 10 minutos. A execução deve terminar sozinha em torno de 25–35 minutos no total.

## O que dá para melhorar (escolha o que quiser aplicar)

### 1. Acelerar o processamento (recomendado)
Aumentar quantas tarefas o processador pega por minuto (de 3 para 6–8) e quantas palavras entram em cada lote. Isso reduz a execução completa de ~30 min para ~10 min, sem mudar nenhuma lógica de coleta.

Risco controlado: cada tarefa faz chamadas à API da Meta; subir demais pode gerar limite de taxa. Sugiro 6 tarefas por tique como ponto seguro.

### 2. Barra de progresso real na tela de Mineração
Hoje o painel só mostra "Executando". Passaria a mostrar:
- fase atual (busca / classificação / finalização);
- contador "X de Y tarefas concluídas" com barra de progresso;
- tempo decorrido e estimativa restante.

Os dados já existem na fila de tarefas — é só exibir, com atualização automática a cada poucos segundos.

### 3. Aviso de execução longa
Se passar de um limite (ex.: 40 min), mostrar um alerta discreto no painel em vez de deixar o admin no escuro.

## Detalhes técnicos

- Fonte dos números: tabelas `meta_refresh_runs`, `meta_refresh_jobs` e `search_keywords`.
- Item 1: ajustar o limite de reivindicação usado pelo processador (`claim_refresh_jobs`, hoje 3) e, opcionalmente, `KEYWORDS_PER_SEARCH_JOB` em `src/lib/meta-mining.server.ts`.
- Item 2: nova consulta agregada por `run_id` em `meta_refresh_jobs`, exibida em `src/routes/admin.mineracao.tsx` com `refetchInterval` curto enquanto houver execução em andamento.
- Item 3: apenas apresentação, no mesmo arquivo.
- Nada da lógica de coleta, classificação ou blacklist é alterado.
