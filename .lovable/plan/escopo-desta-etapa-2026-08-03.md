## Escopo desta etapa

Atualizar a identidade visual (tokens de cor + botões + cards premium) e ampliar a tela de **Palavras-chave** do admin com importação/exportação em massa e contadores. Nada da mineração, das rotas ou das regras de negócio muda.

## 1. Nova paleta (tokens globais)

Ajuste no arquivo de estilos, sem tocar em cores soltas dentro dos componentes.

- Fundo geral passa a **#020617**; cards e popovers passam a **#0F172A**.
- Sidebar alinhada ao novo fundo (tom levemente acima de #020617) e bordas mantidas em branco 8%.
- Degradê azul dos botões principais redefinido para **#1E3A8A → #2563EB → #3B82F6**, com brilho azul no hover.
- Sucesso fixado em **#22C55E** e erro em **#EF4444** — passam a valer para badges "Ativa", toasts e estados de status.
- Remoção do verde como cor de destaque/tema: hoje "warm" e vários badges usam verde como acento. Ele volta a ser exclusivamente indicador de sucesso; o realce visual do app fica com o azul.
- Anel de foco, scrollbar e gráficos passam a usar a nova escala azul.

## 2. Planos premium (PRO e PLUS)

- Degradê dourado atualizado para **#F59E0B → #FBBF24 → #FCD34D**.
- Brilho suave nos cards premium: halo dourado difuso + borda dourada translúcida, aplicado onde já existe o estilo premium (cards de plano, badges PRO na sidebar e telas bloqueadas).
- Cartão PLUS ganha o mesmo tratamento dourado do PRO, mantendo o PRO como o mais destacado.

## 3. Palavras-chave — novas ações

Três botões no topo da página:

1. **Adicionar palavra-chave** — já existe, mantém o formulário atual.
2. **Importar CSV/TXT** — novo.
3. **Exportar CSV** — novo.

### Importação em massa

- Aceita apenas **.csv** e **.txt** (PDF não é suportado).
- Formato de cada linha: `categoria,palavra`.
- Linhas em branco são ignoradas; cabeçalho `categoria,palavra` é detectado e descartado.
- Prévia antes de gravar: total de linhas lidas, quantas são válidas, quantas já existem (duplicadas) e quantas serão criadas.
- Categorias que não existirem são criadas automaticamente na lista de categorias.
- Duplicadas são ignoradas (não sobrescrevem nem geram erro).
- Gravação em lotes, com barra/contador de progresso e resumo final ("X criadas, Y ignoradas").
- A ação fica registrada nos logs do admin.

### Exportação

- Botão exporta em CSV no mesmo formato `categoria,palavra`.
- Respeita o filtro de categoria selecionado na tela: com uma categoria escolhida, exporta só ela; em "Todas as categorias", exporta tudo.
- Nome do arquivo com a categoria e a data.

## 4. Contadores na página

Faixa de cards de resumo acima da tabela:

- **Total de palavras por categoria** — lista compacta com o nome da categoria e a quantidade.
- **Total de palavras ativas** (e o total geral, para comparação).
- **Data da última atualização** — a alteração mais recente entre as palavras.

## Detalhes técnicos

- Tokens redefinidos em `src/styles.css` (`:root` + os `@utility` `bg-gradient-brand`, `bg-gradient-gold`, `pro-shine`, `glow-*`). Nenhuma cor literal nova nos componentes — tudo via token semântico.
- `src/routes/admin.palavras-chave.tsx`: novo bloco de contadores derivado da query já existente (`search_keywords`), diálogo de importação com leitura do arquivo via `FileReader`, parser tolerante a vírgula/ponto-e-vírgula e a espaços, e inserção em lotes com `supabase.from("search_keywords").insert(...)`.
- Criação de categorias novas via `keyword_categories`, reaproveitando a query já existente na tela.
- Exportação gerada no navegador (`Blob` + download), sem chamada ao servidor.
- Registro das ações em `src/lib/admin-log.ts` (`keyword.import`, `keyword.export`).
- Nenhuma alteração de banco de dados é necessária — as tabelas `search_keywords` e `keyword_categories` já suportam tudo isso.
