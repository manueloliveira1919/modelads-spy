# Auditoria da execução bc2440f8 + arquitetura orientada a Ofertas

## Parte 1 — Auditoria (somente leitura, nada foi alterado)

Execução bc2440f8, 18/08 12:00 → 12:08, status success.

| Item | Valor |
|---|---|
| Anúncios encontrados (relatado pela run) | 1.594 |
| Anúncios brutos gravados no estágio de coleta | 1.360 |
| Páginas vistas na coleta | 445 |
| Linhas gravadas em `meta_offers` ("ofertas aprovadas") | 294 |
| `ad_archive_id` distintos nessas 294 linhas | 294 (1 linha = 1 anúncio) |
| Páginas distintas nessas 294 linhas | 152 |
| Combinações página + título distintas | 165 |
| Linhas com 5+ dias | 128 |
| Linhas com 5+ dias E 10+ anúncios da página | 32 |
| Linhas que ficaram ativas | 32 |
| Páginas com 10+ anúncios ativos | 11 |

### Como um anúncio é associado a uma "oferta" hoje

Não existe agrupamento por oferta. O que existe é:

1. **Chave de gravação:** `ad_archive_id` — cada anúncio vira **uma linha própria** em `meta_offers`. Por isso "294 ofertas aprovadas" na verdade são 294 anúncios.
2. **Contagem de anúncios:** `active_ads_count` é a contagem de anúncios **da mesma página (`page_id`)** dentro daquela run. Ela é copiada igual para todas as linhas daquela página — não é a contagem de anúncios daquela oferta.
3. **Deduplicação:** existe uma chave composta `page_id + título(100) + link`, mas ela só vale **dentro de um mesmo lote de classificação**. Entre lotes ela não se aplica — por isso 57 combinações página+título aparecem repetidas na mesma run, e 59 páginas têm mais de uma linha.
4. **Tela principal:** o dashboard usa `list_active_offer_pages`, que faz `DISTINCT ON (page_id)` — ou seja, esconde as repetições **na exibição**, escolhendo 1 anúncio por página e jogando os outros fora da vista, em vez de agrupá-los.

Resumo: hoje o critério de "mesma oferta" é, na prática, **"mesma página"**, e só no momento de exibir. A qualificação 5 dias + 10 anúncios está sendo aplicada a **anúncios**, usando um contador de página — que é exatamente a distorção que você identificou.

### Duplicação observada

- 59 páginas com mais de uma linha (247 linhas ⇒ deveriam ser no máximo 152 unidades se o critério fosse página).
- 57 casos de **mesmo título na mesma página** gravados como linhas diferentes — duplicata pura do mesmo anúncio/criativo.
- Páginas com títulos distintos e produtos distintos aparecem sob a mesma página (ex.: Fernando Cantarelli, 14 linhas, 3 títulos, categorias Beleza e Low Ticket) — prova de que "página" também não é a unidade correta de oferta.

### Amostra de 20 (agrupada por anunciante)

| Anunciante | Linhas gravadas | Anúncios da página | Dias | Títulos distintos | Categoria |
|---|---|---|---|---|---|
| Fernando Cantarelli | 14 | 45 | 21 | 3 | Beleza / Low Ticket |
| Paula Monteiro Personal | 6 | 35 | 12 | 1 | Fitness |
| Military Training System | 6 | 26 | 3 | 1 | Saúde |
| Stardusttv bingo drama | 6 | 19 | 0 | 1 | Finanças |
| Hot Shorts Hub-HP-23 | 6 | 17 | 6 | 3 | Finanças |
| Fantasy books | 6 | 15 | 8 | 1 | Finanças |
| Fernanda Carbosa | 6 | 9 | 36 | 1 | Negócios / Relacionamento |
| Leandro Ladeira | 6 | 9 | 21 | 2 | Finanças / Negócios |
| Hot Shorts Hub-HP-21 | 5 | 13 | 7 | 1 | Finanças |
| Diário do Coração | 5 | 10 | 0 | 1 | Finanças |
| Military Coach Rachel | 5 | 9 | 3 | 1 | Saúde |
| Jessica Dantas MKT | 5 | 7 | 4 | 2 | Finanças / Negócios |
| Guadalupe Zemlak | 4 | 20 | 0 | 1 | Finanças |
| Michael Kevin Neena | 4 | 12 | 21 | 1 | Saúde |
| Izadora Tavares - Z Digital | 4 | 8 | 50 | 1 | Finanças |
| LikeDrama6-XF | 4 | 8 | 7 | 1 | Relacionamento |
| Xixi Drama YX | 4 | 7 | 6 | 1 | Relacionamento |
| Elida Dias - Digital | 4 | 6 | 2 | 1 | Finanças |
| Wyatt Dean Parker | 4 | 6 | 7 | 1 | Relacionamento |
| Ruan Henrique | 4 | 6 | 27 | 1 | Finanças |

Observação lateral, sem ação nesta etapa: várias páginas de dorama (Stardusttv bingo drama, Hot Shorts Hub, LikeDrama6-XF, Xixi Drama YX) continuam entrando — é o mesmo problema do plano anterior, que segue não aprovado e fica parado até você decidir.

## Parte 2 — Correção da arquitetura: Oferta como unidade

### Modelo

```text
OFERTA  (unidade da plataforma, aparece no dashboard)
  ├─ anunciante (page_id / page_name)
  ├─ produto     (identidade da oferta)
  ├─ métricas    ads_count, dias ativo, primeiro/último visto, status
  └─ ANÚNCIOS    (evidência: criativos, títulos, links, ad_archive_id)
```

- **Anúncio** = evidência/criativo. Continua sendo gravado individualmente, com todos os campos atuais.
- **Oferta** = agrupamento de anúncios do mesmo produto do mesmo anunciante. É o que a tela principal lista e o que o filtro de qualificação avalia.

### Como dois anúncios passam a pertencer à mesma oferta

Regra em cascata, do sinal mais forte para o mais fraco, sempre dentro do mesmo `page_id`:

1. **Mesmo destino** — domínio + caminho do `link_url` normalizado (sem UTM e parâmetros de tracking). É o sinal mais confiável de "mesmo produto".
2. **Mesmo título normalizado** — título sem emoji/pontuação/variação de caixa, para criativos que variam só na arte.
3. **Alta similaridade de título/corpo** — quando o link falta e o título varia levemente (números, "Parte 2", nome trocado), agrupa por similaridade acima de um limiar.
4. Sem nenhum dos três, o anúncio forma uma oferta própria — nunca é forçado para dentro de outra.

Anunciante sozinho **não** agrupa: Fernando Cantarelli com 3 produtos vira 3 ofertas, não 1.

### Métricas da oferta

- `ads_count` = número de **anúncios distintos daquela oferta**. Nunca a contagem de anúncios da página do anunciante — o `active_ads_count` por `page_id` de hoje deixa de alimentar a qualificação.
- `dias ativo` = do anúncio mais antigo da oferta até hoje.
- Qualificação **5+ dias E 10+ anúncios**, inalterada, calculada exclusivamente sobre esses dois números da oferta.
- Objetivo declarado do agrupamento: **maximizar ofertas qualificadas e relevantes**, sem sacrificar relevância. Nenhum critério novo de corte entra junto; o agrupamento não pode reduzir artificialmente boas ofertas, apenas parar de contar criativos como ofertas separadas.
- **Sem teto de anúncios**: uma oferta pode ter 20, 50, 100, 200 ou 400+ anúncios; nenhum limite superior é aplicado em nenhuma etapa.
- Uma mesma página com produtos diferentes gera **várias ofertas** — nunca é fundida em uma só (regra 1 e 2 do agrupamento garantem isso; anunciante sozinho não agrupa). Ex.: página com Produto A (20 anúncios/15d) + Produto B (18/12d) + Produto C (12/3d) = 2 ofertas qualificadas e 1 rejeitada, nunca 1 oferta nem 50 anúncios.


### Telas e contadores

- **Dashboard / Ofertas / filtros / favoritos**: unidade é a Oferta. 1 card por oferta, com "40 anúncios" como métrica interna, no lugar do `DISTINCT ON (page_id)` atual.
- **Detalhe da oferta**: cabeçalho com produto, anunciante, dias, status e categoria + galeria de todos os anúncios daquela oferta (criativo, título, data de início, link para a Ad Library).
- **Painel de mineração** passa a exibir, separadamente: anúncios encontrados · anúncios classificados · ofertas formadas · ofertas qualificadas · ofertas rejeitadas (com motivo). "Anúncios encontrados" fica como métrica secundária; o número de destaque da run é **ofertas qualificadas**.

### Relatório de simulação (somente leitura, antes de qualquer alteração)

Executo o agrupamento sobre os dados atuais sem escrever nada e apresento:

- total de ofertas formadas;
- quantas qualificadas (5+ dias E 10+ anúncios) e quantas desqualificadas, com o motivo de cada corte;
- distribuição de anúncios por oferta (1, 2–4, 5–9, 10–19, 20+);
- exemplos de agrupamentos corretos (vários criativos → 1 oferta);
- exemplos de páginas corretamente separadas em ofertas diferentes (ex.: Fernando Cantarelli, hoje 14 linhas com 3 títulos e 2 categorias);
- comparação antes/depois: ofertas visíveis hoje × ofertas qualificadas no novo modelo.

Nenhum `UPDATE`, `DELETE` ou migration destrutiva roda antes da sua aprovação desse relatório. A criação da tabela de ofertas e do vínculo é aditiva e só ocorre depois do aceite.


### Detalhes técnicos

- Nova tabela `offers` (grupo) com `page_id`, `group_key`, `product_title`, `landing_domain`, `category`, `ads_count`, `first_ad_start`, `active_days`, `status`, `is_active`, timestamps; `meta_offers` permanece como tabela de **anúncios** e ganha `offer_id`. Nada é apagado.
- Novo `src/lib/offer-grouping.ts` (puro, testável): normalização de link, normalização de título, similaridade e `buildGroupKey(ad)`.
- `refresh-worker.ts`: após classificar os anúncios, agrupa por `group_key`, faz upsert da oferta, recalcula `ads_count`/`active_days`/`status`/`is_active` no nível da oferta e liga cada anúncio ao seu `offer_id`.
- Nova RPC `list_active_offers` substituindo `list_active_offer_pages`; `listOffers`/`getOffer` passam a devolver oferta + anúncios.
- Backfill único agrupando os anúncios já existentes com a mesma regra, sem apagar nada, com relatório antes/depois — apresentado para sua confirmação antes de rodar.
- Coleta, fila, worker tick, cron, keywords e categorias permanecem intocados.

### Verificação

Rodar uma mineração pequena e conferir: anúncios encontrados × ofertas formadas × ofertas qualificadas; nenhuma oferta com anúncios de produtos diferentes na amostra; dashboard listando ofertas com contagem correta; detalhe abrindo todos os anúncios do grupo.
