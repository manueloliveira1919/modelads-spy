# Diagnóstico da run #51d211d3 (somente análise, nenhuma alteração)

## Tabela dos jobs

| JOB | KIND | STATUS | ATTEMPTS | STARTED | FINISHED | ERROR |
|---|---|---|---|---|---|---|
| 39ccee2f | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| 6b38c744 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| ec28c576 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| 18f00162 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| 084078c2 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| 1ac0b316 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| 81c5fc1e | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| a0fff4b1 | meta.search | failed | 0 | — | 10/08 15:55 | hard timeout |
| f62d1965 | run.finalize | failed | 0 | — | 10/08 16:00 | hard timeout |

(horários em Fortaleza; criados 10/08 15:00:02)

## Veredito

**Os jobs estavam pendentes aguardando worker** — e depois foram marcados como falhos pelo watchdog.

`attempts = 0` e `started_at` vazio em todos os 9 jobs: nenhum worker chegou a reivindicá-los em momento algum. Não houve lock, concorrência nem erro de execução — simplesmente ninguém processou a fila.

## O que os dados mostram

- A run foi criada por **cron** (`triggered_by: "cron"`, 15:00:01), com 8 jobs de busca e 60 keywords. O único log da run é o `queued` — nenhum log `job`.
- O agendamento que **cria** runs está ativo (runs automáticas às 03:00, 09:00 e 15:00 do dia 10). O agendamento que **processa** a fila (worker tick) não rodou nenhuma vez nesses horários — as três runs do dia (0dcecdfa, 76935401, 51d211d3) ficaram todas paradas do mesmo jeito.
- O watchdog está ativo: às 15:55 (55 min) marcou os 8 jobs como `hard timeout` e criou o `run.finalize`, que também nunca foi reivindicado e falhou às 16:00.
- A run #51d211d3 hoje está com status **canceled / phase done** (cancelada manualmente às 18:55). Não a alterei.
- Métricas zeradas são consequência direta: nenhum job de busca rodou, então não há anúncios, páginas, categorias nem keywords com resultado.

## O worker funciona — pela execução manual

A run seguinte, **#0ff39e97** (iniciada manualmente às 18:55), está processando normalmente: jobs com `attempts = 1`, `started_at` preenchido, 2 concluídos, 2 em execução, e logs reais de busca ("8 termos, 351 anúncios", "8 termos, 168 anúncios", "8 termos, 39 anúncios").

Ou seja: o ciclo de ticks do painel aciona o worker corretamente e o botão "Processar fila agora" reivindicaria esses jobs sem problema — desde que estivessem `pending`. Os da #51d211d3 já estão `failed`, então hoje ele não os pega mais.

## Conclusão da causa

O agendamento de criação de runs está ligado, mas o agendamento do worker continua desligado desde a Fase 1. Toda run criada por cron nasce órfã: ninguém processa, o watchdog a mata em 55 minutos. Só as runs disparadas com o painel aberto funcionam, porque o próprio painel aciona o worker.

## Próximos passos possíveis (aguardando sua autorização)

1. Religar o agendamento do worker tick (resolve a causa raiz das runs automáticas).
2. Ou desligar também o agendamento que cria runs, deixando a mineração 100% manual — evita runs órfãs e histórico poluído de falsos "hard timeout".
3. Opcional: no painel, mostrar aviso quando existir run automática com jobs pendentes sem worker.

Nenhuma dessas ações foi executada. Nada de código, keywords, categorias, classificação, blacklist, Meta API ou cron foi alterado neste diagnóstico.
