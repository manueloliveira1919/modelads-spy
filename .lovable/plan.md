# Execução manual de mineração sem cron + painel de progresso completo

## Diagnóstico confirmado

Verifiquei no banco e no código:

- Os três agendamentos (`modelads-refresh-worker-tick`, `modelads-refresh-offers-daily`, `modelads-refresh-watchdog`) estão com `active = false` — pausados na Fase 1 e ainda não religados.
- O botão "Executar Mineração" chama só `/api/public/hooks/refresh-offers`, que cria a run e enfileira os jobs; quem processa a fila é `/api/public/hooks/refresh-worker`, hoje acionado apenas pelo cron.

Com o cron desligado, a run manual fica eternamente em `running` com todos os jobs `pending`. É exatamente o comportamento descrito.

## Parte A — Execução manual independente do cron

1. **Disparo imediato do worker**: ao clicar em "Executar Mineração", depois de criar a run e os jobs, o painel aciona o worker na hora.
2. **Ciclo contínuo**: enquanto a run estiver ativa e a tela aberta, o painel continua acionando o worker a cada ~4s (um por vez, sem sobreposição) até a run finalizar sozinha.
3. **Botão "Processar fila agora"**: destrava runs antigas presas, sem cron.
4. **Botões "Pausar" e "Cancelar"**: pausar interrompe o ciclo de ticks (jobs ficam na fila); cancelar encerra a run e marca os jobs pendentes como cancelados.
5. **Selo de cron desligado**: aviso visível quando os agendamentos automáticos estão pausados.

## Parte B — Barra de progresso e observabilidade

6. **Barra principal**: percentual = jobs concluídos ÷ jobs totais, com "56 de 72 jobs concluídos", atualizando a cada 4s.
7. **Timeline de fases**: Criando jobs → Buscando anúncios → Classificando → Aplicando blacklist → Salvando ofertas → Finalizando, com a fase atual destacada em azul e as concluídas marcadas.
8. **Cards em tempo real**: páginas analisadas, anúncios encontrados, ofertas aprovadas, descartadas, e jobs concluídos / em execução / pendentes / falhos.
9. **Tempos**: horário de início, tempo decorrido, estimativa de tempo restante e velocidade (jobs/minuto).
10. **Descartes por motivo**: blacklist, idioma, baixa relevância, sem categoria, sem link, sem texto e duplicadas.
11. **Estado "aguardando worker"**: se a run está `running` com todos os jobs pendentes há mais de 5 minutos, mostra alerta claro com o botão "Processar fila agora" em vez de aparentar que está minerando.
12. **Rótulos de status detalhados**: aguardando worker, buscando, classificando, salvando, finalizando, concluída, bloqueada, falhou.
13. **Persistência ao recarregar**: o progresso é reconstruído sempre de `meta_refresh_runs`, `meta_refresh_jobs` e `mining_run_progress` — nada fica só na memória da página. Ao abrir a tela com uma run em andamento, a barra reaparece e os ticks recomeçam.
14. **Histórico melhorado**: colunas Início, Tempo, Jobs (concluídos/total), Páginas, Ofertas e Status; clique na linha abre um modal com categorias processadas, quantidade de palavras-chave, anúncios encontrados, descartes por motivo, erros e tempo por etapa.

## Parte C — Auditoria completa da execução

15. **Faixa de resumo no topo**: ID da run, categoria minerada (ou "Todas"), quantidade de palavras-chave usadas, início, tempo decorrido, estimativa restante e velocidade (jobs/minuto).
16. **Indicador de saúde**: 🟢 Saudável (<15 min sem progresso), 🟡 Lenta (15–30 min), 🔴 Travada (>30 min sem progresso), calculado pelo tempo desde o último job concluído.
17. **Métricas por categoria em tempo real**: anúncios encontrados por categoria durante a run.
18. **Ranking de palavras-chave**: aba com as palavras que mais trouxeram anúncios e também a lista das que retornaram zero.
19. **Painel de logs em tempo real**: linha do tempo com horário e evento (criando jobs, buscando, blacklist, classificando, salvando, finalizando), lida de `mining_logs`.
20. **Resumo final da execução**: palavras processadas, anúncios encontrados, páginas encontradas, ofertas aprovadas, descartadas, taxa de aprovação e tempo total.
21. **Exportar relatório**: botão com CSV e PDF contendo métricas, erros, descartes, categorias, palavras-chave, tempos e status final.


## Detalhes técnicos

- `src/routes/admin.mineracao.tsx`: loop de ticks via `useEffect` + `setInterval` (~4s) chamando `POST /api/public/hooks/refresh-worker` com bearer de admin; guarda contra chamadas concorrentes, parada automática quando a run sai de `running`, no unmount, ou quando pausado pelo usuário. O `refresh-worker` já autoriza bearer de admin (`authorize` → `mining_is_admin`), então nenhuma mudança de segurança é necessária.
- `src/components/mining-progress.tsx`: ampliar `MiningProgressPanel` com timeline de fases, cards de contadores, velocidade/ETA e detalhamento de descartes. O RPC `mining_run_progress` já devolve jobs por tipo (total/done/failed/pending), `ads_found`, `upserts` e os descartes; onde faltar granularidade (ex.: "sem link" separado de "sem texto", páginas analisadas em tempo real), ajusto o RPC para expor os campos, sem tocar na lógica de classificação.
- **Status detalhados**: os nomes (`waiting_worker`, `searching`, `classifying`, …) serão apresentados na interface, derivados de `phase` + estado da fila, sem alterar os valores gravados em `meta_refresh_runs.status` — trocar o enum exigiria migrar constraints e reescrever o worker, o que sai do escopo de "só observabilidade". Se quiser os estados persistidos no banco, faço em etapa separada.
- **Pausar/Cancelar**: cancelar usa uma RPC nova (`mining_cancel_run`) que marca jobs pendentes como falhos e fecha a run; pausar é apenas do lado do painel (para o ciclo de ticks).
- Modal de detalhes lê `mining_logs` da run para montar erros e tempo por etapa.
- Nenhuma regra de coleta, classificação, blacklist ou categoria é alterada.

## Fora do escopo

Religar os cron jobs — continuam pausados até sua confirmação visual.
