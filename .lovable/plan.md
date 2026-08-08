# Corrigir as métricas da run (anúncios, páginas) sem tocar na mineração

## O que a investigação mostrou (verificado no banco)

Run `1ea4ee7c-54bf-4240-8abd-4447b2b6f773`: status `success`, `offers_upserted = 239`, `pages_seen = 241`, `details = {coverage: partial, deactivated: 0, search_errors: 0}`. Os logs somam exatamente **1.083 anúncios** e **239 ofertas**. Ou seja: a coleta e a classificação estão corretas — o problema é só de leitura/exibição.

Duas causas independentes, ambas confirmadas:

**1. O painel não consegue ler o progresso.** A função `mining_run_progress` (que é quem calcula "anúncios encontrados" somando os logs) chama internamente a checagem de administrador, mas o usuário logado não tem permissão de executar essa checagem. A chamada falha, o painel recebe "nada" e mostra `0` em anúncios. As ofertas continuam aparecendo (239) porque esse número tem um segundo caminho de leitura, direto da tabela da run. É exatamente o padrão relatado: anúncios 0, páginas 0, ofertas 239.

**2. Os dados brutos são apagados no fim da run.** A etapa de finalização apaga `meta_refresh_ads_raw`, que é a fonte de "páginas encontradas", "anúncios por categoria" e "ranking de palavras-chave". Verificado: 0 linhas restantes para essa run. Por isso o histórico mostra "Nenhum anúncio coletado ainda" e páginas 0, mesmo com `pages_seen = 241` gravado na run.

Sobre os pontos levantados: a execução `partial` não bloqueia métrica nenhuma (só evita desativar ofertas antigas), e o worker está sim gravando os números — em logs e nas colunas `offers_upserted`/`pages_seen`. O que falta é permissão de leitura e um resumo persistido antes da limpeza.

## Correção

1. **Liberar a leitura do progresso**: ajustar a permissão da checagem de admin usada por `mining_run_progress` para que o painel consiga chamá-la. A regra de acesso continua idêntica — quem não é admin continua recebendo "forbidden".

2. **Congelar o resumo antes da limpeza**: a rotina de limpeza passa a, antes de apagar os dados brutos, gravar dentro de `meta_refresh_runs.details.summary` um retrato da run: anúncios encontrados, páginas encontradas, anúncios por categoria, ranking de palavras-chave, termos planejados e totais de jobs. A limpeza continua acontecendo igual; nada da coleta muda e o worker não é alterado.

3. **Cadeia de leitura à prova de zero no painel** (`admin.mineracao.tsx` e `mining-progress.tsx`):
   - Anúncios encontrados: progresso ao vivo → resumo congelado → 0.
   - Páginas: dados brutos ao vivo → resumo congelado → coluna `pages_seen` da run (nunca mais mostra 0 quando a run tem 241).
   - Ofertas aprovadas: progresso ao vivo → coluna `offers_upserted`.
   - Categorias e palavras-chave: ao vivo durante a execução, resumo congelado depois. "Nenhum anúncio coletado ainda" só aparece quando realmente não houve coleta.

4. **Tempo real durante a execução**: nada muda no mecanismo — com a permissão corrigida, os cards de anúncios/páginas passam a atualizar a cada ciclo de polling, que já existe.

5. **Histórico**: runs antigas já finalizadas (incluindo a #1ea4ee7c) não têm o resumo congelado, então usam a coluna `pages_seen` e a soma dos logs; runs novas terão o resumo completo com categorias e palavras-chave.

## Detalhes técnicos

- Migração: `GRANT EXECUTE` para `authenticated` na função de checagem de papel usada por `mining_run_progress` (ela é `SECURITY DEFINER` e apenas retorna booleano), ou tornar `mining_run_progress` `SECURITY DEFINER` mantendo a barreira `forbidden` — escolho a segunda, que não amplia superfície.
- Migração: reescrever `mining_cleanup_run` para gravar o snapshot em `details.summary` (via `jsonb_set`) antes dos `DELETE`. Mesma assinatura, mesmo chamador, nenhum arquivo do worker é tocado.
- Frontend: `summarizeProgress` e `RunDetailDialog` passam a receber os fallbacks descritos; `ads_found` também sai de `details.summary.ads_found` quando o RPC de progresso não tiver dados.
- Não são alterados: coleta, classificação, blacklist, palavras-chave, categorias, worker, execução manual, cron (segue pausado).

## Verificação após a correção

Rodo consultas na run #1ea4ee7c e reporto de onde cada número vem: anúncios (soma dos logs de busca = 1.083), páginas (`meta_refresh_runs.pages_seen` = 241) e ofertas (`offers_upserted` = 239), confirmando que o painel exibe esses valores.
