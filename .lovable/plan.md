

## Corrigir Separacao de Aves Vivas no Dialog de Separacao

### Problema

O `SeparacaoDialog` busca itens do pedido fazendo join apenas com a tabela `produtos`, mas itens de aves vivas tem `produto_id = null` e usam `produto_animal_id` + `lote_producao_id`. Por isso:

- **Nome do produto** aparece vazio (nao encontra em `produtos`)
- **Estoque disponivel** mostra 0 KG (nao existe registro em `produtos`)
- **Status** mostra "Sem estoque" mesmo tendo aves no lote

### Solucao

Alterar `SeparacaoDialog.tsx` para:

1. **Incluir join com `produtos_animais`** na query de `pedido_itens`, alem do join existente com `produtos`
2. **Incluir join com `lotes`** para buscar dados do lote vinculado (quantidade de aves, nucleo, galpao)
3. **Mapear corretamente** o nome, estoque e unidade dependendo se e produto normal ou ave viva:
   - Se `produto_animal_id` preenchido: usar nome de `produtos_animais`, calcular estoque a partir do lote (aves vivas - mortalidade - vendidas)
   - Se `produto_id` preenchido: manter logica atual com `produtos`

### Detalhes Tecnicos

**Arquivo:** `src/components/comercial/SeparacaoDialog.tsx`

**Query atualizada (linhas 69-75):**
```typescript
const { data: pedidoItens } = await supabase
  .from('pedido_itens')
  .select(`
    *,
    produto:produtos(nome, estoque_atual, unidade_medida),
    produto_animal:produtos_animais(nome, unidade_venda),
    lote:lotes(id, quantity_aves, data_alojamento, nucleo:nucleos(nome), galpao:galpoes(nome))
  `)
  .eq('pedido_id', pedido.id);
```

**Mapeamento atualizado (linhas 80-89):**
- Para cada item, verificar se e ave viva (`item.produto_animal_id != null`)
- Se ave viva:
  - `produto_nome` = nome do produto animal + info do lote (nucleo/galpao)
  - `estoque_disponivel` = buscar aves vivas do lote (quantity_aves - mortalidade acumulada - quantidade ja vendida)
  - `unidade_medida` = unidade do produto animal ou "KG"
  - `lote_producao_id` = `item.lote_producao_id`
- Se produto normal: manter logica atual

**Calculo de estoque de aves vivas:**
Para itens de ave viva, buscar a mortalidade acumulada do lote e quantidade ja vendida em outros pedidos para calcular disponibilidade real:
```typescript
// Para cada item de ave viva, buscar mortalidade do lote
const { data: mortalidade } = await supabase
  .from('mortalidade')
  .select('quantidade')
  .eq('lote_id', item.lote_producao_id);

const totalMortalidade = mortalidade?.reduce((sum, m) => sum + (m.quantidade || 0), 0) || 0;
const avesVivas = (lote.quantity_aves || 0) - totalMortalidade;
```

**Logica de debito de estoque na confirmacao:**
- Para itens de ave viva, NAO debitar de `produtos.estoque_atual` (nao existe)
- Registrar apenas no kardex e na separacao, pois o controle de aves e pelo lote

Nenhuma alteracao de banco de dados necessaria - apenas logica frontend no `SeparacaoDialog.tsx`.
