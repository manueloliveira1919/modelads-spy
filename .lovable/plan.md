# Camada de Qualidade Comercial das Ofertas (modo observação)

Classificação determinística em 3 estados — `commercial` | `suspicious` | `entertainment` — aplicada DEPOIS do agrupamento, no nível da oferta, sem tocar em mineração, coleta, palavras-chave, jobs, cron, categorias, blacklist, agrupamento, régua 5+ dias E 10+ anúncios, RLS ou estrutura do dashboard.

## O que NÃO muda (confirmações)

- Mineração, worker, jobs, cron e as 100 palavras-chave por ciclo: **intocados**. Nenhuma linha do `refresh-worker.ts` / `refresh-offers.ts` será alterada.
- Agrupamento (`offer-grouping.ts`, similaridade 0,72) e qualificação (`offers_recompute`, 5+ dias E 10+ anúncios): **intocados**.
- Blacklist existente: **intocada** — nenhuma palavra nova será adicionada.
- RLS: nenhuma policy criada/alterada/removida. Novas RPCs seguem o padrão já existente (SECURITY DEFINER + `search_path` fixo + checagem admin onde há escrita).
- **Nenhum UPDATE/DELETE destrutivo**: a única escrita é preencher 3 colunas NOVAS em `offers`. Nada é apagado, nada fica invisível, `visible`/`qualified` não são recalculados.
- Vitrine: por padrão **nada é escondido**. Os filtros de qualidade começam em "Todas".

## Banco de dados (1 migration)

Tabela `offers` — 3 colunas novas, todas nullable/default seguro, sem backfill destrutivo:

- `commercial_quality text` — NULL = "ainda não analisada"; valores: `commercial`, `suspicious`, `entertainment` (com CHECK).
- `quality_reasons jsonb` — lista dos motivos/sinais encontrados (ex.: `["dominio_entretenimento:reelshort", "frase:assistir episodio completo"]`).
- `quality_checked_at timestamptz` — quando a classificação rodou.

Sem GRANT novo (colunas herdam os grants da tabela). Sem trigger novo.

RPCs novas (mesmo padrão das existentes):

1. `offers_quality_snapshot(p_ids uuid[] default null)` — SECURITY DEFINER, somente leitura. Retorna por oferta: id, page_name, product_title, landing_key, category, language, ads_count, active_days + evidências dos anúncios (títulos, descrições e hosts/caminhos dos links, vindos de `meta_offers` sem filtro de `is_active`, igual `list_offer_ads` já faz).
2. `offers_set_quality(p_rows jsonb)` — SECURITY DEFINER, exige `mining_is_admin(auth.uid())`. Atualiza APENAS as 3 colunas novas.

RPCs existentes alteradas de forma **aditiva** (mesma lógica, só expõem as colunas novas):

3. `list_active_offers()` — passa a retornar também `commercial_quality` e `quality_reasons`. Filtros (`visible AND qualified`), ordenação e demais colunas permanecem idênticos.
4. `get_offer_row(p_id)` — idem, para a página de detalhe.

## Código

**Novos arquivos:**

- `src/lib/offer-commercial-quality.ts` — função pura e testável `classifyOfferQuality(input)`, sem I/O:
  - Sinais fortes (cada um registrado em `reasons`): frases compostas ("assistir episódio completo", "doramas online", "novelas completas", "série completa", "todos os episódios"...), marcadores `(Dublado)`/`[Cap. 3]`/`(Temporada 2)`, gancho de reviravolta dramática, domínio/host de entretenimento (reelshort, dramabox, shortmax, netflix, globoplay, primevideo, disney+, hbo/max, portais de IPTV/novelas/doramas), path de landing com `/episodio`, `/capitulo`, `/assistir` etc. Reutiliza os detectores já existentes em `category-scoring.ts` exportando-os (sem mudar comportamento).
  - Sinais fracos/ambíguos: uma palavra isolada como "filme", "série", "episódio" — nunca reprovam sozinha.
  - Decisão conservadora: sinal decisivo (domínio de entretenimento, marcador entre parênteses, promo de app de assistir) OU 2+ sinais fortes ⇒ `entertainment`. 1 sinal forte OU 2+ fracos ⇒ `suspicious`. Caso contrário ⇒ `commercial`.
  - Entrada usa somente dados que a oferta já tem: nome do anunciante, product_title, títulos/descrições dos anúncios, landing host+path, categoria, ads_count, active_days. Sem `page_id` como identidade, sem `active_ads_count` da página, sem teto de anúncios.
- `src/lib/offer-commercial-quality.test.ts` — testes unitários (vitest) dos 6 casos pedidos: comercial claro; entretenimento claro; ambíguo ⇒ suspicious; produto comercial contendo palavra compartilhada ("filme" num contexto comercial) ⇒ não vira entertainment; página com vários produtos (cada oferta classificada isoladamente); oferta com vários anúncios (sinais agregados).
- `src/lib/offer-quality.server.ts` — leitura do snapshot em lotes + escrita via RPC.
- `src/lib/offer-quality.functions.ts` — server fn `auditOfferQuality({ dryRun })` protegida (requireSupabaseAuth + verificação admin). `dryRun: true` = simulação somente leitura (retorna contagens, motivos agregados e amostras, sem gravar).

**Arquivos alterados:**

- `src/lib/offers-shape.ts` — tipo `Offer` ganha `commercialQuality` e `qualityReasons`; `rowToOffer` mapeia.
- `src/components/offer-card.tsx` — badge discreto: 🔥 Comercial / 🟡 Suspeita / 🎬 Entretenimento (sem badge quando ainda não classificada).
- `src/routes/ofertas-do-dia.tsx` — nova linha de filtro "Qualidade": Todas | Comerciais | Suspeitas | Entretenimento. Padrão "Todas" — **não esconde nada**.
- `src/routes/admin.qualidade.tsx` — seção de diagnóstico: total analisadas, comerciais, suspeitas, entretenimento, não analisadas, principais motivos e sinais mais frequentes + botão "Classificar ofertas agora" (roda a auditoria real).
- `package.json` — adiciona `vitest` (devDependency) e script `test`.
- `src/integrations/supabase/types.ts` — regenerado automaticamente após a migration.

## Como a classificação roda sobre as ofertas existentes

A migration **não** classifica nada (colunas nascem NULL). A classificação é executada sob demanda pelo admin, em lotes, via `auditOfferQuality`: lê as evidências pela RPC de snapshot, classifica em TS puro e grava só as 3 colunas novas. É idempotente e pode ser reexecutada quando quiser. Ofertas mineradas no futuro ficam "não analisadas" até a próxima execução (proposital nesta etapa de observação — nenhum hook no worker).

## Validação (antes de encerrar a etapa)

1. Migration aplicada; testes unitários verdes (`vitest run`).
2. Simulação somente leitura (`dryRun`) sobre TODAS as ofertas: apresento contagens por estado e **pelo menos 20 exemplos** classificados (mistura de comerciais, suspeitas e entretenimento, com os motivos de cada um).
3. Só depois da simulação apresentada, rodo a gravação real e confiro badges/filtros no preview.
4. Build sem erros.

**PARO aqui e aguardo aprovação antes de qualquer lógica de esconder/rejeitar.**
