# Fase 2 — Gravação real da Qualidade Comercial (backfill único)

Gravar a classificação aprovada na Fase 1 nas ofertas existentes, preenchendo `commercial_quality`, `quality_reasons` e `quality_checked_at`. **Nenhuma regra de exibição muda** — a vitrine continua exatamente como está.

## O que NÃO acontece nesta fase

- Nenhuma alteração em `visible`, `qualified`, `is_active`, ofertas, anúncios, mineração, worker, cron, blacklist ou categorias.
- Nada é escondido da vitrine: entretenimento e suspeitas continuam aparecendo normalmente.
- Nenhum badge/filtro de qualidade na interface (fica para fase futura, mediante aprovação).
- Nenhuma migration de estrutura: as 3 colunas já existem (criadas na Fase 1). A gravação é operação de dados (UPDATE), feita via `run_sql`.

## Entregas desta fase

### 1. Classificação idêntica à simulação aprovada

- Reutiliza exatamente o mesmo classificador determinístico (`src/lib/offer-commercial-quality.ts`) e os mesmos dados de evidência (RPC `offers_quality_snapshot`, somente leitura) já validados no dryRun sobre as 7.310 ofertas.
- Como o classificador é determinístico e nada mudou na base, o resultado é o mesmo da simulação: 6.005 commercial / 1.114 entertainment / 191 suspicious / 0 não analisadas.

### 2. Gravação no banco (somente as 3 colunas de qualidade)

- UPDATE em lotes na tabela `offers`, preenchendo por oferta:
  - `commercial_quality` = `commercial` | `suspicious` | `entertainment`
  - `quality_reasons` = lista de motivos encontrados (jsonb)
  - `quality_checked_at` = timestamp da gravação
- O UPDATE toca **apenas** essas 3 colunas — nenhum outro campo é mencionado no comando.
- Execução via ferramenta de dados (`run_sql`), com sua aprovação.

### 3. Verificação pós-gravação (relatório final no chat)

Antes de gravar, capturo um retrato (somente leitura) dos contadores atuais para comparação. Depois da gravação, confirmo:

1. Quantidades finais gravadas: Commercial / Suspicious / Entertainment (conferindo com o dryRun).
2. Que `visible`, `qualified` e `is_active` estão **idênticos** ao retrato anterior (comparação antes/depois).
3. Que a vitrine continua com as mesmas 85 ofertas (nada sumiu).
4. As 4 ofertas de entretenimento da vitrine, agora com seus valores gravados (motivos inclusos).
5. As 5 ofertas suspeitas da vitrine, com motivos.
6. Amostra de conferência de ofertas `commercial` gravadas.

## Validação

1. Contadores gravados batem com o dryRun (6.005 / 191 / 1.114).
2. Comparação antes/depois prova que visibilidade, qualificação e mineração ficaram intactas.
3. Relatório final entregue no chat.

**PARO após o relatório e aguardo sua aprovação. Nenhuma regra de remoção/ocultação de ofertas nesta fase.**
