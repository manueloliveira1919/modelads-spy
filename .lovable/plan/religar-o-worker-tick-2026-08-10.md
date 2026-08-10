# Religar o worker tick

## Estado verificado agora

- Os 2 registros travados **já estão limpos**: `76935401` e `0dcecdfa` estão `failed` com `finished_at` preenchido (22:59). Não há nenhuma run com `finished_at` nulo.
- A run manual `0ff39e97` terminou com **sucesso**: 260 ofertas, 270 páginas.
- Falta apenas religar o agendamento do worker — é o que impedia as runs automáticas (03:00 / 09:00 / 15:00) de serem processadas.

## O que farei

Reativar somente o agendamento `modelads-refresh-worker-tick`, mantendo os demais exatamente como estão:

- `modelads-refresh-offers-daily` — permanece como está
- `modelads-refresh-watchdog` — permanece como está

Depois de reativar, confirmo no banco que o tick está ativo e acompanho a próxima execução para verificar que os jobs passam a ser reivindicados (`attempts = 1`, `started_at` preenchido).

## Detalhes técnicos

- `cron.alter_job` no job `modelads-refresh-worker-tick` definindo `active = true`, via ferramenta de dados (não é migração de esquema).
- Verificação em `cron.job` e `cron.job_run_details` após a reativação.
- Nenhuma alteração em código, keywords, categorias, classificação, blacklist, Meta API, worker ou nos outros agendamentos.
