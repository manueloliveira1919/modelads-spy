# Correção definitiva: ofertas qualificadas sumindo da vitrine

A correção pedida já foi aplicada e validada no turno anterior. Este plano confirma o escopo exato e o que falta apenas como verificação final.

## O que já está no ar

1. `mining_deactivate_stale` passou a receber a cobertura da run. Runs parciais retornam 0 e não desativam nenhum anúncio por ausência; só uma cobertura explicitamente completa executa o stale global.
2. Worker (`refresh-worker.ts`): removido o resquício `meetsMinimumScale` na decisão de `meta_offers.is_active`. Anúncio visto na run fica ativo; qualificação vive só em `offers` (`ads_count >= 10 AND active_days >= 5`).
3. `list_active_offers`, `get_offer_row` e `list_offer_ads` viraram `SECURITY DEFINER` com `search_path` controlado, tendo `offers` como unidade — sem `page_id` e sem `DISTINCT ON(page_id)`. Uma oferta `visible + qualified` não some porque nenhum anúncio individual está `is_active`.
4. Nada foi tocado em mineração, 100 palavras-chave, categorias, blacklist, agrupamento, similaridade 0,72 ou régua de qualificação.

## Estado atual do banco

- offers total: 7.239
- qualificadas: 339
- visíveis: 79
- visíveis + qualificadas: 79
- RPC anon/app: passou de 2 para o conjunto completo de visíveis

## O que falta (verificação)

- Rodar uma mineração pequena de validação e confirmar 0 desativações indevidas.
- Reconferir a lista nominal das 10 ofertas citadas (Personal Life, Jacke Molonha, Zanon Macedo, Astroguia, Isabela Balbino, Lorrayne Beling, Elida Dias, Dr. Coluna Saudável, Lucas Batista, Universidade Cristina Cairo) na vitrine.
- Reportar a tabela final: total → qualified → visible → visible+qualified → RPC admin → RPC anon → renderizadas em "Ofertas do Dia".

Observação: o filtro padrão da aba esconde "testando", então parte dos cards só aparece ao escolher "Todos" — regra existente, não será alterada.
