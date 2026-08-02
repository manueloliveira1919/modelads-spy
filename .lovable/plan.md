## Diagnóstico confirmado

Há **dois bloqueios diferentes** no mesmo fluxo:

1. **O clique no painel está retornando 401**
   - O painel envia o token da sessão em `src/routes/admin.mineracao.tsx:78-87`.
   - O endpoint valida o usuário e depois chama `mining_is_admin` usando o cliente público em `refresh-offers.ts:106-119`.
   - Porém, no banco, `mining_is_admin` só pode ser executada pelo papel interno de serviço. Assim, a verificação administrativa falha e a requisição é recusada.
   - Os logs confirmam três chamadas recentes ao endpoint com **HTTP 401**.

2. **Quando uma execução entra na fila, o worker não consegue processá-la**
   - `refresh-worker.ts:461-465` também usa o cliente público para chamar `claim_refresh_jobs`.
   - A migration `20260730005619...sql:26-30` restringiu corretamente essa função ao papel interno de serviço.
   - O cron chama o worker a cada minuto, mas ele retorna **HTTP 500: `permission denied for function claim_refresh_jobs`**.
   - Por isso as runs ficam paradas em `running` e, após 30 minutos, o watchdog muda o status para `blocked` com “run abandonada”.

A rota `/api/public/hooks/refresh-worker` **já existe atualmente**; o problema não é mais 404, e sim a credencial incorreta usada internamente.

## Plano de correção

1. **Manter as funções sensíveis fechadas ao público**
   - Não conceder `EXECUTE` para `anon` ou usuários comuns, evitando reabrir a vulnerabilidade de segurança corrigida anteriormente.

2. **Corrigir a autorização do administrador**
   - Validar o bearer token do usuário.
   - Consultar a role administrativa com o cliente interno apenas no servidor, depois de confirmar a identidade.
   - Tratar explicitamente erros da consulta de role, distinguindo `invalid_token`, `not_admin` e falha interna.

3. **Corrigir enfileirador e worker**
   - Fazer `enqueueRefresh` e o processamento do worker utilizarem o cliente interno do backend para as RPCs `mining_*` e `claim_refresh_jobs`.
   - Preservar integralmente keywords, filtros, classificação, snapshots, paginação e lógica da Meta.

4. **Melhorar o retorno do painel**
   - Informar “Mineração enfileirada” após o clique, em vez de “Mineração concluída”.
   - Exibir mensagens legíveis para sessão expirada, usuário sem permissão e erro do worker.

5. **Validar ponta a ponta**
   - Testar o clique como administrador.
   - Confirmar criação da run e dos jobs.
   - Confirmar que o cron recebe 200, reivindica jobs e avança as fases.
   - Verificar que a execução não termina novamente como `blocked` pelo watchdog.

Essa correção resolve a inconsistência criada quando as RPCs foram restringidas ao papel interno, mas o código continuou chamando-as com a chave pública.