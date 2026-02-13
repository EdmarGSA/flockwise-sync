

## Variacao Percentual da Ultima Compra no Ticker

Adicionar a variacao percentual entre a ultima e a penultima compra de cada produto do grupo Cereais, exibida no ticker ao lado do preco.

---

### Alteracoes

**1. Edge Function `commodity-prices/index.ts`**

Na secao que agrupa os itens de OC por produto (linhas 130-145), em vez de guardar apenas o mais recente, guardar os **dois mais recentes** por produto. Calcular a variacao percentual entre eles:

- Manter um `Record<string, any[]>` com ate 2 itens por `produto_id`
- Se houver 2 itens, calcular: `variacao = ((preco_ultimo - preco_penultimo) / preco_penultimo) * 100`
- Se houver apenas 1 item, `variacao = null`
- Incluir o campo `variacao` no objeto retornado em `ultimaCompra`

**2. Componente `CommodityTicker.tsx`**

Nenhuma alteracao necessaria - o componente ja renderiza o campo `variacao` com icones TrendingUp/TrendingDown e formatacao percentual (linhas 75-82). Basta que a Edge Function passe o valor corretamente.

---

### Detalhe Tecnico

```text
Logica no Edge Function:

ocItens (ordenados por created_at DESC):
  Milho -> [compra_recente: R$1.35, compra_anterior: R$1.20]
  variacao = ((1.35 - 1.20) / 1.20) * 100 = +12.50%

Resultado no ticker:
  Milho | Ult. Compra | 1,35 | R$/KG | +12.50% (icone verde)
```

Apenas a Edge Function precisa ser alterada. O frontend ja suporta a exibicao.
