# Auditoria da mineração + plano de qualidade e cobertura

## 1. O que a auditoria encontrou (números reais do banco)

**Acervo de ofertas**
- 7.149 ofertas formadas, apenas **330 qualificadas** (visíveis).
- 6.599 rejeitadas por poucos anúncios — **4.289 delas têm 1 único anúncio**.
- 574 ofertas estão em 5–9 anúncios (quase na régua).
- Maior oferta: 204 anúncios.

**Funil dos últimos 2 dias**
- 10.820 anúncios encontrados → 2.283 cortados por blacklist, 1.598 duplicados, 395 baixa relevância, 100 sem destino → 1.643 gravados.

**Criativos (causa principal da página parecer vazia)**
- A fase de captura de imagem/vídeo está **desativada no código** porque a Meta bloqueia a leitura da página do anúncio.
- 0 criativos capturados nos últimos 2 dias; só 22 das 330 ofertas qualificadas têm mídia.

**Ruído dentro das ofertas qualificadas (o ponto que você levantou)**
- **181 de 330 não têm link de destino nenhum** — não dá para saber que produto é.
- **81 não são em português** (ES, EN, FR, AR, IT, DE, JA, RO).
- **32 são apps de leitura/dorama/novela** (mrgbook.com, "Bom livro", "Contos que Amam").
- **176 estão em categorias que não existem mais** (Info, Nutra, Aplicativo/App, Mentoria…).
- Somando sem repetir, a maioria das 330 é ruído. **Ofertas realmente confiáveis hoje: por volta de 110–130.**

**Cobertura de palavras-chave**
- 400 palavras ativas, 60 por execução, 4 execuções/dia → ciclo completo em ~1,7 dia.
- 208 tarefas de busca já falharam por limite da Meta (#613) e 91 por tempo esgotado — na prática parte das palavras não roda, e as que rodam repetem as mesmas ofertas grandes.

## 2. Correções de qualidade (foco em oferta, não em anúncio)

Uma oferta só entra na página se **provar que é uma oferta de verdade**:

1. **Destino obrigatório**: precisa ter link/domínio próprio. Sem destino, fica no acervo mas não aparece. (Corta os 181.)
2. **Português apenas**: idioma da oferta tem que ser PT. (Corta os 81.)
3. **Anti-entretenimento reforçado**: apps de leitura, novela, dorama e "romance grátis" reprovam mesmo com 200 anúncios. (Corta os 32.)
4. **Categoria válida**: só as 8 categorias oficiais. Ofertas em categoria legada são reclassificadas; se não encaixar em nenhuma, não aparece.
5. **Anunciante coerente**: mesmo domínio de destino com nomes de página diferentes (caso Dressly, hoje 3 ofertas duplicadas) é agrupado em 1 oferta só.

**Régua de qualificação**: mantém 5+ dias E 10+ anúncios da mesma oferta, mas com um **selo de confiança** calculado por destino próprio + preço identificado + estrutura reconhecida (VSL/quiz/WhatsApp) + consistência de criativos. A ordenação da página passa a ser por confiança, não por número de anúncios — assim uma oferta de 12 anúncios sólida fica acima de uma de 80 anúncios genérica.

Estimativa depois dos cortes: **~120 ofertas realmente válidas hoje**, e a base cresce a cada ciclo porque as 574 quase-lá continuam acumulando.

## 3. Cobertura: 100 palavras por ciclo, sem repetir

- Passa de 60 para **100 palavras por execução**.
- A fila já roda por ordem de "menos minerada primeiro"; será reforçada com um **carimbo de ciclo**: uma palavra só volta a ser minerada quando **todas as outras do ciclo já rodaram**. Com 400 palavras ativas → **4 execuções fecham 1 ciclo completo**.
- Ofertas do ciclo anterior **não são apagadas**: continuam no acervo, acumulando anúncios e podendo subir de status.
- Ao fechar o ciclo completo, roda uma **reavaliação geral**: cada oferta é recomparada e só perde espaço para uma nova se a nova tiver confiança maior. Oferta boa antiga nunca é substituída por oferta nova pior.
- **Anti-repetição na busca**: ofertas já qualificadas e ainda ativas deixam de consumir vaga de processamento — a execução prioriza páginas/destinos ainda não vistos no ciclo, o que é o que hoje faz voltar sempre as mesmas.

**Estabilidade da coleta** (hoje é o que mais derruba cobertura):
- Espaçar as chamadas à Meta e tratar o erro #613 com espera e reenfileiramento por palavra, não pela tarefa inteira (hoje 8 palavras caem juntas quando 1 estoura).
- Aumentar o processamento por ciclo de 2 para 4 tarefas por minuto, com o freio automático do rate limit.

## 4. Período de ciclo sugerido

- **Execução a cada 6 horas** (como já é): 4 execuções × 100 palavras = **ciclo completo de 400 palavras em 24 horas**.
- **Renovação da vitrine: a cada 24 h**, no fim do ciclo — ofertas novas entram, as antigas boas permanecem.
- **Validade de uma oferta na vitrine: 14 dias sem novos anúncios**. Passou disso sem sinal de vida, sai da vitrine (fica no acervo e volta se voltar a anunciar).
- Ofertas com 30+ dias e 30+ anúncios ganham selo "Escaladíssima" e ficam fixas enquanto continuarem ativas.

## 5. Criativos (decisão sua: seguir sem imagem por enquanto)

Os cards vão trabalhar com título, descrição, preço detectado, domínio de destino, dias no ar, nº de anúncios e link direto para a Biblioteca de Anúncios. Fica registrado que a captura de imagem exige um serviço externo pago — dá para ligar depois sem refazer nada.

## Detalhes técnicos

- `src/lib/offer-heuristics.ts` e `src/lib/category-scoring.ts`: regra de destino obrigatório, idioma PT, anti-entretenimento reforçado, mapeamento de categorias legadas para as 8 oficiais.
- Nova coluna `offers.confidence` (0–100) + `offers.visible`, calculadas em `offers_recompute`; `list_active_offers` passa a filtrar por `visible` e ordenar por `confidence`.
- Migração de limpeza única marcando as ofertas atuais que caem nos cortes (sem apagar linhas).
- `search_keywords`: nova coluna `cycle_id`/`mined_in_cycle`; `loadActiveKeywords` só devolve palavras do ciclo corrente; ao esvaziar, abre ciclo novo. `keywords_per_run` para 100.
- `refresh-worker.ts`: `JOBS_PER_TICK` 2 → 4; erro #613 reenfileira apenas a palavra afetada.
- Job `run.finalize` do último job do ciclo dispara a reavaliação geral e a expiração de 14 dias.
- Coleta, blacklist e cron mantidos; nenhuma palavra-chave é apagada.
