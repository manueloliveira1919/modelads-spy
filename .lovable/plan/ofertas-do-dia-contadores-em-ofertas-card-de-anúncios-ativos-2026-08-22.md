# Ofertas do Dia: contadores em ofertas + card de anúncios ativos

## O que será feito

### 1. Subtítulo conta OFERTAS, não anúncios
Na aba "Ofertas do Dia", o texto hoje é:
`81 anúncios monitorados · 5 escaladíssimas · 12 escalado · 64 testando`

Passa a ser (valores reais de hoje):
**`83 ofertas monitoradas · 5 escaladíssimas · 12 escalado · 66 testando`**

Os 3 contadores (escaladíssimas / escalado / testando) são mantidos — só muda o primeiro número, que passa a contar ofertas.

### 2. Ofertas "testando" passam a aparecer por padrão
**Por que elas não aparecem hoje:** a página abre com o filtro de escala travado em "Escalado + Escaladíssimo", que esconde as 66 ofertas em teste. Elas só surgem se você abrir Filtros e escolher "Todos (inclui testando)".

**Correção:** o filtro padrão passa a ser **"Todos"**, então ao abrir a página você vê as 83 ofertas (as 17 validadas primeiro, depois as 66 testando). As opções de filtro continuam existindo para quem quiser ver só escaladas/escaladíssimas.

### 3. Novo card pequeno no canto superior direito (acima do botão Filtros)
Card discreto mostrando o total de **anúncios ativos monitorados** — a soma dos anúncios de todas as ofertas visíveis (hoje: **1.571 anúncios**). Exemplo visual:

```text
┌─────────────────────────┐
│ 1.571                   │
│ anúncios monitorados    │
└─────────────────────────┘
[Buscar...] [Filtros]
```

## Detalhes técnicos
- Arquivo alterado: `src/routes/ofertas-do-dia.tsx` (somente frontend, sem mexer em banco, mineração ou regras).
- O total de anúncios usa a soma de `activeAds` das ofertas já carregadas — nenhuma consulta nova ao banco.
- O valor do contador principal usa `offers.length` (já disponível) com o texto "ofertas monitoradas".

## Não será alterado
- Mineração, qualificação, categorias, blacklist, agrupamento — nada.
- Nenhuma migration, UPDATE ou DELETE no banco.
