# Corrigir mineração finalizando como “blocked”

## Diagnóstico confirmado

- A run mais recente (`b3ba75bf…`) coletou anúncios normalmente: **4 jobs de busca concluídos, 455 resultados encontrados e 72 páginas**.
- A classificação processou **406 anúncios**, mas gravou **0 ofertas**. Os descartes somaram exatamente os 406: 64 por blacklist, 202 duplicados, 133 por baixa relevância e 7 sem texto.
- A principal causa está no vocabulário de categoria: as palavras cadastradas são frases longas (média de 4,2 a 4,9 palavras), mas o classificador procura cada frase inteira no anúncio e exige duas correspondências fortes. Assim, mesmo anúncios encontrados por termos válidos quase nunca atingem o mínimo.
- O status `blocked` é consequência de `0 upserts`, não de falha na API: todos os jobs terminaram sem erro.
- Existe ainda um problema de integridade: cada run cobre somente 30 das 400 palavras, porém a finalização desativa globalmente tudo que não apareceu nessa pequena fatia. Hoje há **15.069 ofertas no banco e nenhuma ativa**.
- No tratamento de rate limit, o worker informa que preservará os anúncios já coletados, mas lança a exceção antes de gravar essas linhas.

## Correção

1. **Corrigir a relevância por categoria**
   - Transformar as frases cadastradas em termos úteis normalizados, removendo palavras genéricas e duplicadas.
   - Usar a categoria da palavra que originou a busca como sinal válido, sem aceitar cegamente anúncios sem correspondência textual.
   - Aplicar um limiar compatível com frases de busca: um termo específico forte, ou combinação de termos menores com sinais comerciais.
   - Manter blacklist, idioma e exclusão de ruído político/entretenimento.

2. **Impedir desativação global em runs rotativas**
   - Não executar `mining_deactivate_stale` quando a run cobre apenas uma fatia das palavras ou uma categoria específica.
   - Registrar no contexto da run se ela é completa ou parcial para que a finalização tome a decisão correta.
   - Reservar a desativação global para uma varredura realmente completa.

3. **Preservar coleta anterior ao rate limit**
   - Gravar as linhas já coletadas antes de devolver o job para espera.
   - Reenfileirar somente o trabalho ainda não executado, evitando repetir termos e gerar mais chamadas à Meta.
   - Não consumir tentativa em erro 613.

4. **Diferenciar ausência de resultado de bloqueio técnico**
   - Finalizar uma run saudável sem aprovados como “concluída sem ofertas”, em vez de `blocked`.
   - Usar `blocked` somente para falha real que impeça coleta/classificação.
   - Exibir no painel os totais por motivo de descarte para facilitar ajustes futuros.

5. **Recuperar e validar**
   - Executar testes unitários do classificador com anúncios reais representativos das oito categorias e exemplos de ruído.
   - Rodar uma nova mineração controlada e confirmar: anúncios coletados, parte aprovada, ofertas ativas e nenhuma desativação indevida.
   - Depois da validação, restaurar a visibilidade das ofertas da última mineração bem-sucedida que ainda atendam às regras atuais, sem reativar ruído antigo.

## Arquivos e backend envolvidos

- `src/lib/category-scoring.ts`: tokenização, pontuação e uso controlado da categoria de busca.
- `src/lib/mining-config.server.ts`: construção do vocabulário e metadados de cobertura da run.
- `src/routes/api/public/hooks/refresh-worker.ts`: persistência parcial, status final e desativação condicional.
- `src/routes/api/public/hooks/refresh-offers.ts`: registrar termos restantes e tipo de cobertura.
- Funções do banco de finalização/requeue: ajustar metadados e comportamento sem abrir acesso público.
- `src/components/mining-progress.tsx` e painel admin: apresentar “concluída sem aprovados” e descartes com clareza.

## Fora de escopo

- Não alterar categorias, palavras-chave cadastradas, planos, autenticação ou o visual geral da plataforma.