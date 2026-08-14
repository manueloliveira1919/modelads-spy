# Reforço do filtro de entretenimento + resposta às três dúvidas

## 1. A correção anterior foi publicada?

Verificado no banco antes de escrever este plano:

- A alteração de `category-scoring.ts` (app de dorama + palavras genéricas) está no código desde 12/08 20:09 UTC.
- Nenhuma oferta nova com a frase "assistir a todos os dramas curtos populares" foi gravada depois disso: as últimas entradas com essa frase são de **03 e 04/08**, todas já `is_active = false`.
- Os exemplos novos que você viu ("Harper Reeves…", "Dra. Samia…", "Encontra o teu estilo") também são registros antigos, de **20/07 a 04/08** — alguns ainda ativos porque o recálculo em lote da última vez não os pegou.

Ou seja: a correção está no código e vale para minerações novas, mas **as ofertas já salvas nunca foram reavaliadas com ela**. É por isso que continuam aparecendo em produção. Como parte desta etapa, confirmo também se o build publicado é posterior a 12/08 antes de qualquer nova mineração.

## 2. Filtro de entretenimento antes da categorização

Hoje o worker roda `pickCategory` primeiro e só depois `isEntertainmentNoise`. Vou inverter: **entretenimento é avaliado primeiro e bloqueia em qualquer categoria**, sem depender de pontuação de nicho.

Sinais novos, cobrindo o padrão que passou:

- **Vocabulário ampliado**: "dramas curtos", "drama curto", "short drama", "mini drama", "reels drama", nomes de apps de dorama (RomanceRush, ReelShort, DramaBox, ShortMax, GoodShort, FlexTV, MoboReels e similares por padrão de nome).
- **Sinopse narrativa**: título/descrição que apresenta um personagem por nome próprio + situação de enredo ("Harper Reeves está apenas tentando terminar o seu último ano em Yale…", "A Dra. Samia usou o chefe como escudo…"). Detecção por estrutura: nome próprio como sujeito + verbo de enredo + elementos de romance/segredo/CEO/casamento/vingança, sem preço, sem oferta e sem chamada de compra.
- **Título em inglês de romance** ("Kissing My Obsessive Enemy", "My Billionaire Ex…") em anúncio direcionado ao Brasil.
- **Página com nome de pessoa genérica** (Grace Saige Law, Howle Goldfarb Francisco, Abu Toha Adnan, Nông Bảo) combinada com qualquer um dos sinais acima.

Descarte continua contabilizado como "entretenimento" no painel de progresso.

## 3. Moda caindo em Finanças

Os anúncios "Encontra o teu estilo 👗" (Dressly, Julie Fashion, Sophia Harper) estão gravados em Info e, em um caso, Finanças — nenhuma dessas é a categoria certa, e moda/roupa feminina não é uma categoria ativa da plataforma.

Correção: anúncio cujo conteúdo é claramente moda/vestuário (estilo, roupa, vestido, look, guarda-roupa, moda feminina, loja de roupas) e que não pontua de verdade em nenhuma categoria oficial passa a ser **descartado por baixa relevância**, em vez de ser encaixado à força numa categoria vizinha. Junto disso, reviso o vocabulário de Finanças para tirar termos curtos/ambíguos que estejam permitindo esse encaixe.

## 4. Amostra antes de aplicar

Igual à última vez: depois do código pronto, rodo a simulação sobre as ofertas já salvas e te mostro

- **10 a 15 exemplos** do grupo que passaria a ser reprovado (título, página, categoria atual, motivo);
- contagem antes/depois por status e quantas seriam desativadas por entretenimento e por moda/baixa relevância.

Só aplico o `UPDATE` depois da sua confirmação.

## 5. O gap 22.909 aprovadas × 1.116 ativas

Conferido no banco: nos últimos 3 dias foram gravadas 1.502 ofertas e apenas 58 estão ativas — mesma proporção do gap que você notou. As causas são estas, e não há uma quarta escondida:

1. **Corte de escala mínima** (5+ dias E 10+ anúncios), aplicado no momento em que a oferta é gravada. É de longe o maior responsável: a maioria dos anúncios coletados é nova ou de página pequena.
2. **Entretenimento/baixa relevância**, que descarta antes de gravar.
3. **`mining_deactivate_stale`** — em runs de cobertura completa, desativa tudo que não reapareceu naquela run. Esse é o único mecanismo além dos dois que você já conhecia; ele só roda em cobertura `full` (runs parciais estão protegidas desde a correção anterior).

Ou seja, o gap é esperado com os critérios atuais e não é bug. Como o item 3 é o único que pode desativar oferta boa por ausência temporária, incluo na verificação um número explícito de "desativadas por stale" por run, para você acompanhar.

## Detalhes técnicos

- `src/routes/api/public/hooks/refresh-worker.ts`: mover o bloco `isEntertainmentNoise` para antes de `pickCategory`, alimentado com `page_name + headline + body + description + link`; contador `entertainment` mantido.
- `src/lib/category-scoring.ts`: ampliar `ENTERTAINMENT_WORDS`, novo detector de sinopse narrativa (nome próprio + enredo, sem sinal comercial), padrão de título de romance em inglês, lista/heurística de apps de drama curto, reforço de `isGenericPageName`; nova checagem de moda/vestuário sem categoria oficial → baixa relevância; limpeza de termos ambíguos no vocabulário de Finanças.
- Simulação em script local sobre `meta_offers` (sem escrita), com amostra impressa para revisão.
- Aplicação final: um único `UPDATE` de `is_active`/`status`, sem DELETE e sem migration de esquema, apenas após confirmação.
- Sem alterações em coleta, fila, worker tick, cron, keywords, categorias ou Central de Mineração.
