

## Inverter Ordem da Lista de Pesagens (Última Primeiro)

### Problema
A lista de pesagens mostra os itens na ordem de inserção (primeiro pesado no topo). O usuário quer ver a última pesagem no topo para conferir mais facilmente.

### Alteração

**`src/components/lotes/PesagemDialog.tsx`**

- Inverter a renderização dos itens tanto no mobile (card list) quanto no desktop (table), usando `[...itens].reverse()` e ajustando o `#` para manter a numeração original
- Na lista mobile (linha ~1048): `{[...itens].reverse().map((item, idx) => ...}` com `#{itens.length - idx}`
- Na tabela desktop (linha ~1082): mesma lógica de reversão
- Manter a numeração original (ex: se tem 5 itens, o último adicionado aparece no topo como #5)

Alteração mínima, apenas na renderização — não muda a estrutura de dados nem o salvamento.

