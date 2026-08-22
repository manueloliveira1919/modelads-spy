# Fase 1 — Simulação dryRun da Qualidade Comercial (escopo aprovado)

Construir a infraestrutura mínima e executar **somente a simulação somente leitura** (`auditOfferQuality({ dryRun: true })`). Nenhum dado é gravado nesta fase.

## O que NÃO acontece nesta fase

- Nenhuma escrita em `commercial_quality`, `quality_reasons`, `quality_checked_at` — as colunas nascem NULL e permanecem NULL.
- `visible`, `qualified`, `is_active`, ofertas, anúncios, mineração, worker, cron, blacklist, categorias, agrupamento e régua 5+ dias E 10+ anúncios: **intocados**.
- Nenhuma mudança visual na vitrine (badges e filtro de qualidade ficam para uma fase futura).
- A RPC de escrita (`offers_set_quality`) **não é criada** nesta fase — impossível gravar por acidente.
- A gravação real da classificação só acontece depois da sua aprovação do relatório.

## Entregas desta fase

### 1. Migration (somente estrutura, zero escrita de dados)

- Tabela `offers`: 3 colunas novas, todas nullable — `commercial_quality text` (CHECK: `commercial` | `suspicious` | `entertainment`), `quality_reasons jsonb`, `quality_checked_at timestamptz`. Nascem NULL em todas as linhas; nenhum backfill.
- RPC nova `offers_quality_snapshot(p_ids uuid[] default null)` — SECURITY DEFINER, **somente leitura**. Por oferta retorna: id, page_name, product_title, landing_key, category, language, ads_count, active_days + evidências dos anúncios (títulos, descrições e host/caminho dos links, vindos de `meta_offers` sem filtro de `is_active`, como `list_offer_ads` já faz).
- Sem GRANT novo (colunas herdam os grants da tabela), sem trigger, sem policy nova/alterada.

### 2. Classificador puro e testável

- `src/lib/offer-commercial-quality.ts` — `classifyOfferQuality(input)`, sem I/O, determinística:
  - **Sinais decisivos**: domínio/host de entretenimento no destino (reelshort, dramabox, shortmax, netflix, globoplay, primevideo, disney+, hbo/max, portais de IPTV/novelas/doramas); marcador `(Dublado)`/`[Cap. 3]`/`(Temporada 2)`; promo de app de assistir ("baixe o app para assistir").
  - **Sinais fortes**: frases compostas ("assistir episódio completo", "doramas online", "novelas completas", "série completa", "todos os episódios"...), gancho de reviravolta dramática, path de landing com `/episodio`, `/capitulo`, `/assistir`. Reutiliza os detectores já existentes em `category-scoring.ts` apenas exportando-os (sem mudar comportamento).
  - **Sinais fracos/ambíguos**: palavra isolada ("filme", "série", "episódio") — nunca reprovam sozinha.
  - **Decisão conservadora**: 1 sinal decisivo OU 2+ fortes ⇒ `entertainment`. 1 forte OU 2+ fracos ⇒ `suspicious`. Caso contrário ⇒ `commercial`. Todo sinal encontrado é registrado em `reasons`.
  - Entrada usa só dados que a oferta já tem (anunciante, product_title, títulos/descrições dos anúncios, landing host+path, categoria, ads_count, active_days). Sem `page_id` como identidade, sem teto de anúncios.
- `src/lib/offer-commercial-quality.test.ts` — testes vitest dos 6 casos: comercial claro; entretenimento claro; ambíguo ⇒ suspicious; produto comercial com palavra compartilhada ("filme" em contexto comercial) ⇒ não vira entertainment; página com vários produtos (cada oferta classificada isoladamente); oferta com vários anúncios (sinais agregados).
- `package.json` — adiciona `vitest` (devDependency) e script `test`.

### 3. Server fn de auditoria (somente dryRun)

- `src/lib/offer-quality.functions.ts` — `auditOfferQuality({ dryRun: true })` protegida (requireSupabaseAuth + verificação admin). Lê o snapshot pela RPC, classifica em TS puro e **retorna** o relatório — sem chamar nada que escreva.

### 4. Execução da simulação e relatório

- dryRun sobre **todas as 7.310 ofertas** da tabela `offers` (hoje: 7.310 total, 347 qualificadas, 85 visíveis+qualificadas na vitrine), com recorte destacado das 85 da vitrine no relatório.
- Relatório completo apresentado aqui no chat:
  1. Total de ofertas analisadas.
  2. Commercial / 3. Suspicious / 4. Entertainment / 5. Não analisadas (sem evidência suficiente).
  6. Principais motivos encontrados e quantidades.
  7. Pelo menos 20 exemplos reais (anunciante, produto/oferta, categoria, nº de anúncios, dias, classificação, motivos) — priorizando filmes, séries, doramas, novelas, streaming e IPTV que apareceram nas minerações.
  8. Pelo menos 10 exemplos classificados como `commercial` para checagem de falsos positivos.

## Validação

1. Migration aplicada; testes unitários verdes (`vitest run`); build sem erros.
2. dryRun executado e relatório entregue.

**PARO após o relatório e aguardo sua aprovação. Nenhuma gravação real nesta fase.**
