# Execução manual de mineração sem depender do cron

## Diagnóstico confirmado

Verifiquei agora no banco e no código:

- Os três agendamentos (`modelads-refresh-worker-tick`, `modelads-refresh-offers-daily`, `modelads-refresh-watchdog`) estão com `active = false` — foram pausados de propósito na Fase 1 e ainda não foram religados.
- O botão "Executar Mineração" chama apenas `/api/public/hooks/refresh-offers`, que cria a run e enfileira os jobs. A própria resposta diz: "o worker (a cada minuto) processa os lotes aos poucos".
- Quem processa a fila é `/api/public/hooks/refresh-worker`, e hoje ele só é chamado pelo cron.

Conclusão: com o cron desligado, a run manual fica em `running` com todos os jobs `pending`. É exatamente o comportamento descrito.

## O que vou mudar

1. **Disparo imediato do worker na execução manual**
   Ao clicar em "Executar Mineração", depois de criar a run e os jobs, o painel passa a acionar o worker diretamente, sem esperar cron.

2. **Ciclo contínuo enquanto a run estiver ativa**
   Enquanto a run estiver em andamento e a tela de Mineração estiver aberta, o painel continua acionando o worker em intervalos curtos (a cada poucos segundos), até a run terminar. Assim a barra de progresso avança em tempo real e a run finaliza sozinha.
   Trava de segurança: um acionamento por vez (sem sobreposição) e parada automática quando a run sai de `running`.

3. **Botão "Processar fila agora"**
   Um botão manual na tela de Mineração para destravar qualquer run antiga que ficou parada, sem precisar do cron.

4. **Aviso de "aguardando worker"**
   Se a run estiver em `running` com todos os jobs pendentes por mais de 5 minutos e nenhum progresso, a tela mostra um alerta claro ("aguardando processamento — clique em Processar fila agora"), em vez de aparentar que está minerando.

5. **Aviso quando o cron estiver desligado**
   Um selo na tela de Mineração indicando que os agendamentos automáticos estão pausados, para não haver mais confusão entre "não minerou" e "não foi agendado".

## Detalhes técnicos

- `src/routes/admin.mineracao.tsx`: após a mutação de enqueue, iniciar um loop de ticks (`setInterval` controlado por `useEffect`, ~4s, com guarda de execução concorrente) que faz `POST /api/public/hooks/refresh-worker` com o bearer do admin. O loop para quando `runsQuery`/`mining_run_progress` indicar status diferente de `running`, ao desmontar o componente, ou após um teto de tentativas.
- `refresh-worker` já aceita bearer de admin (`authorize` → `mining_is_admin`), então nenhuma mudança de segurança é necessária no endpoint.
- O detector de "aguardando worker" é derivado no cliente a partir de `mining_run_progress` (jobs `pending` > 0, `done` = 0) e de `started_at`; não altero o enum de status no banco para evitar quebrar os checks de `meta_refresh_runs.status`. Se você preferir mesmo um status persistido `waiting_worker`, faço em uma etapa separada com migração dos constraints.
- Nada da lógica de coleta, classificação ou blacklist é alterado nesta etapa.

## Fora do escopo (confirmar depois)

Religar os cron jobs continua pausado até sua confirmação visual, conforme combinado.
