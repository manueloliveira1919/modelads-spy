# Correção da mineração — em fases, com prova em números

## Número atual confirmado (antes de qualquer correção)

Consulta executada agora em `meta_offers`:

- **Ofertas ativas: 0**
- **Total de ofertas: 15.069**

Ou seja: o banco tem 15 mil ofertas e nenhuma visível. Isso confirma o diagnóstico da desativação global indevida.

Jobs agendados hoje (todos ativos):

```text
modelads-refresh-worker-tick     * * * * *     (worker, a cada minuto)
modelads-refresh-offers-daily    0 */6 * * *   (dispara nova mineração)
modelads-refresh-watchdog        */5 * * * *   (timeout/finalização)
```

## Fase 1 — Parar o sangramento (antes de qualquer mineração nova)

1. **Pausar o agendamento que inicia novas minerações** (`modelads-refresh-offers-daily`) e o worker, para que nenhuma run rode enquanto a correção não estiver no ar. O watchdog fica pausado junto, já que ele também finaliza runs.
2. **Corrigir a desativação global em runs parciais**
   - A finalização só pode desativar ofertas quando a run cobriu de fato todas as palavras-chave e todas as categorias.
   - A run passa a registrar se é completa ou parcial (fatia de palavras / categoria específica).
   - Em run parcial, a desativação global não é executada de forma alguma.
3. **Publicar essa correção.**
4. **Conferir novamente a contagem de ativas** e mostrar o número, para confirmar que parou de cair.

Nenhuma mineração nova (manual ou automática) roda antes desse passo estar publicado e conferido.

## Fase 2 — Restaurar visibilidade

- Reativar as ofertas que foram desativadas indevidamente pela última finalização e que ainda atendem às regras atuais (idioma, blacklist, sem ruído político/entretenimento), sem trazer de volta lixo antigo.
- Mostrar a contagem de ativas depois da restauração.

## Fase 3 — Relevância de categoria

- Normalizar o vocabulário: as palavras cadastradas são frases longas, e hoje o classificador procura a frase inteira e exige duas correspondências fortes — por isso quase nada passa.
- Usar a categoria da palavra que originou a busca como sinal de apoio, sem aprovar cegamente anúncio sem correspondência textual.
- Limiar compatível com frases de busca: um termo específico forte, ou combinação de termos menores com sinais comerciais.
- Manter blacklist, filtro de idioma e exclusão de ruído.

## Fase 4 — Rate limit e status final

- Gravar os anúncios já coletados antes de devolver o job para espera no erro 613; reenfileirar só o que faltou e não consumir tentativa.
- Finalizar run saudável sem aprovados como "concluída sem ofertas"; reservar `blocked` para falha técnica real.
- Exibir no painel os totais por motivo de descarte.

## Fase 5 — Validar e religar

- Testes do classificador com anúncios reais das oito categorias e exemplos de ruído.
- Rodar uma mineração controlada e conferir: anúncios coletados, parte aprovada, ofertas ativas e nenhuma desativação indevida.
- Só então reativar os agendamentos.

## Arquivos e backend envolvidos

- Finalização/desativação: funções de banco de finalização da run e `refresh-worker.ts`.
- Cobertura da run: `refresh-offers.ts` e `mining-config.server.ts`.
- Relevância: `category-scoring.ts`.
- Painel: `mining-progress.tsx` e telas de mineração/qualidade.

## Fora de escopo

- Não alterar categorias, palavras-chave cadastradas, planos, autenticação ou o visual da plataforma.
