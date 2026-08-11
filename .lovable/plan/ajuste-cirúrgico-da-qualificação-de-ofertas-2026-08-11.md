# Ajuste cirúrgico da qualificação de ofertas

Alteração restrita à camada de classificação. Coleta, fila, worker, cron, execução manual, Central de Mineração, palavras-chave e categorias permanecem intactos.

## 1. Novos critérios de status

Três status apenas, com os dois critérios exigidos ao mesmo tempo (AND):

| Status | Dias ativos | Anúncios ativos |
|---|---|---|
| Testando | 5+ | 10+ |
| Escalado | 20+ | 20+ |
| Escaladíssimo | 30+ | 30+ |

Avaliação do maior para o menor: 30/30 → Escaladíssimo; senão 20/20 → Escalado; senão 5/10 → Testando.

Abaixo de 5 dias ou 10 anúncios: a oferta continua sendo salva (histórico preservado), mas entra como inativa, portanto não aparece no dashboard. Se em uma mineração posterior ela atingir o mínimo, volta a ficar visível normalmente.

O status "Crescendo" (e o rótulo "Escalando") sai da interface: filtros, selos e contadores passam a usar apenas os três status. Os registros já salvos são remapeados pelos novos critérios.

Nomes exibidos: **Testando**, **Escalado**, **Escaladíssimo**.

## 2. Volume de anúncios sem teto

Não há limite superior: 30, 100, 500+ são gravados como vêm da Meta. O número real continua em `active_ads_count`, e a ordenação passa a considerá-lo como desempate dentro do mesmo status (mais anúncios primeiro) — sem nenhuma mudança de layout nesta etapa.

## 3. Validação de pertinência da categoria

Hoje um anúncio pode entrar em Saúde/Finanças/etc. com poucas correspondências. Passa a haver uma verificação de conteúdo antes de salvar:

- A categoria é confirmada pelo texto real do anúncio (nome da página, título, corpo, descrição e link de destino), não pelo termo pesquisado. O termo continua servindo apenas como desempate.
- Exige-se relevância consistente: pelo menos duas correspondências específicas da categoria; uma só correspondência não aprova mais, mesmo com preço no criativo.
- Nova checagem de incompatibilidade temática (entretenimento/dorama/novela/streaming), reforçada — detalhe abaixo.
- A blacklist atual continua rodando antes de tudo, sem alteração de conteúdo.

### 3.1 Checagem reforçada de entretenimento/dorama

Além do vocabulário atual (filmes, séries, doramas, novelas, IPTV, TV/canais, apps de assistir, animes, futebol ao vivo, "catálogo completo", "todos os episódios", plataformas conhecidas), três novos sinais:

1. **"(Dublagem)" no título** — e variantes equivalentes entre parênteses/colchetes (Dublado, Legendado, Dublagem PT-BR, Episódio N, Cap. N, Temporada N). Reprova sempre, sem exceção e sem pontuação.
2. **Gancho de reviravolta dramática** — padrões narrativos típicos de novela/dorama detectados por estrutura, não por palavra isolada: "Traída por X, ela Y", "Humilhada por…, ela deu o troco", "Descubro que…, decido…", "Depois de X anos, ele voltou…", "Ela era pobre/empregada, mas…", "Ninguém sabia que ela era…", "Meu marido/esposa/patrão… mas eu…", vingança/troco/herança/CEO bilionário + protagonista feminina. Reprova quando o título combina uma cláusula de humilhação/traição/segredo com uma cláusula de reação dramática.
3. **Página genérica + título de romance dramático** — nome de página que parece pessoa genérica ou identificador aleatório ("Charles Wilson", "New-reading", "NS-fhll0702": nome próprio sem marca/negócio, ou string alfanumérica com hífen/dígitos), quando combinado com o sinal 2 ou com vocabulário de romance/drama. Isoladamente o nome da página não reprova — só reprova em combinação.

Todos contabilizados como descarte "entretenimento" no painel de progresso.

## 4. Aplicação ao que já está salvo

Depois da correção publicada, recalculo em lote sobre as ofertas existentes, usando **a data real de início do anúncio** (cenário B) como base dos dias ativos:

- status recalculado pelas novas regras;
- ofertas abaixo do mínimo (5 dias / 10 anúncios) marcadas como inativas;
- ofertas com conteúdo de entretenimento/dorama desativadas;
- relatório com contagem antes/depois por status e quantas foram desativadas por incompatibilidade.

Nenhuma palavra-chave, categoria ou dado é apagado — só o status e a marcação de ativo/inativo mudam.

**Confirmação antes de aplicar:** depois de o código novo estar pronto (incluindo a checagem reforçada de entretenimento), rodo a simulação novamente no mesmo formato — quantas ofertas ficam em cada status e quantas viram inativas, agora já descontando as reprovadas por entretenimento — e só aplico o UPDATE depois da sua confirmação.

## Detalhes técnicos

- `src/lib/offer-heuristics.ts`: `classifyStatus(activeDays, activeAds)` reescrita com os limiares AND, retornando `"testando" | "escalado" | "escaladissimo"`; nova função `meetsMinimumScale(activeDays, activeAds)` para o corte de visibilidade.
- `src/lib/category-scoring.ts`: `pickCategory` passa a exigir `strongMatches >= 2` (remove a exceção de 1 match com preço) e ganha `isEntertainmentNoise({ headline, pageName, text })` com os três novos sinais (regex de "(Dublagem)"/episódio, padrões de reviravolta, heurística de nome de página genérico em combinação).
- `src/routes/api/public/hooks/refresh-worker.ts`: apenas o cálculo de `status`, `is_active: meetsMinimumScale(...)` e o novo contador `entertainment` no `discard_breakdown`. Nada de fila, retries ou timeouts é tocado. Dias ativos derivados de `ad_start_date` quando disponível.
- `src/lib/offers-shape.ts`: `OfferStatus` passa a `"escaladissimo" | "escalado" | "testando"`, com mapeamento de valores legados (`crescendo`/`escalando`/`escaladissima`) na leitura.
- `src/components/offer-card.tsx`, `src/routes/index.tsx`, `src/routes/ofertas.tsx`, `src/routes/ofertas-do-dia.tsx`, `src/routes/oferta.$id.tsx`, `src/routes/buscar.tsx`: rótulos/filtros para os três status e ordenação secundária por `active_ads_count`.
- `src/components/mining-progress.tsx`: exibe o novo motivo de descarte.
- Dados: um único `UPDATE` de recálculo de `status` e `is_active` em `meta_offers` (dias por `ad_start_date`) e desativação das incompatíveis — sem migration de esquema, sem DELETE, executado só após sua confirmação da simulação.

## Verificação antes de concluir

Typecheck, carregamento da Central de Mineração, execução manual de uma mineração pequena com jobs sendo processados, cron e worker inalterados, e contagem de palavras-chave/categorias idêntica antes e depois.
