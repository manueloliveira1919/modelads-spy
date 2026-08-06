# Seleção e exclusão em massa de palavras-chave

Hoje só dá para excluir uma palavra por vez (menu de cada linha). Vamos adicionar seleção múltipla e exclusão em massa na aba Palavras-chave do admin.

## O que muda na tela

- **Caixa de seleção em cada linha** da tabela.
- **Caixa no cabeçalho** que marca/desmarca todas as palavras visíveis (respeitando os filtros de busca/categoria aplicados).
- **Barra de ação** que aparece quando há itens marcados: "X selecionadas" + botão "Excluir selecionadas" + "Limpar seleção".
- **Botão "Excluir todas"** no topo, ao lado de Importar/Exportar: apaga todas as palavras do filtro atual (ou tudo, se não houver filtro).
- Confirmação antes de excluir, mostrando a quantidade exata ("Excluir 137 palavras-chave? Esta ação não pode ser desfeita.").
- Após excluir: aviso de sucesso, lista atualizada e seleção limpa.
- Adicionar palavras continua funcionando igual (formulário e importação CSV/TXT).

## Detalhes técnicos

- Estado `selectedIds: Set<string>` em `src/routes/admin.palavras-chave.tsx`; seleção do cabeçalho opera sobre a lista já filtrada.
- Nova mutation de exclusão em massa usando `supabase.from("search_keywords").delete().in("id", ids)`, em lotes de 200 ids para evitar URLs longas, com barra de progresso quando passar de 200.
- Registro em `logSystem` com a ação `keyword.bulk_delete` e a quantidade removida.
- Invalidação das queries de palavras-chave e de categorias após a exclusão.
- Sem mudança de banco: as políticas atuais já permitem exclusão por admin.
