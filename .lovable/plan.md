

## Corrigir Selecao de Produto Animal na Venda de Aves

### Problema Identificado

O produto animal "Fango de corte" existe no banco de dados, vinculado ao grupo **"Aves de Corte"**. Porem, o codigo em `LotesVendaSection.tsx` busca o grupo com o filtro:

```
ilike('nome', '%aves corte%')
```

Esse filtro NAO encontra "Aves de Corte" porque o nome real tem a palavra **"de"** entre "Aves" e "Corte". Com isso, `grupoId` fica `undefined`, e a busca de produtos animais usa `eq('grupo_animal_id', '')`, retornando **zero produtos**. O Select fica vazio e o usuario nao consegue selecionar nenhum produto.

### Solucao

Alterar o filtro ilike para `%aves%corte%` (com wildcard entre as palavras), garantindo que funcione independente de palavras intermediarias como "de", "de corte", etc.

### Alteracao em `src/components/comercial/LotesVendaSection.tsx`

**Linha 76** - Mudar o filtro de busca do grupo:

- De: `.ilike('nome', '%aves corte%')`
- Para: `.ilike('nome', '%aves%corte%')`

Isso fara com que "Aves de Corte", "Aves Corte", "Aves De Corte" e outras variacoes sejam todas encontradas corretamente.

Apenas **1 caractere** precisa ser alterado. Nenhuma outra mudanca necessaria.

