

## Corrigir Visibilidade da Barra de Cotacoes

O ticker esta invisivel porque o header usa `position: fixed`, fazendo com que ele flutue sobre o conteudo. O `CommodityTicker` esta no fluxo normal do documento, logo fica escondido atras do header fixo.

### Solucao

Mover o `CommodityTicker` para **dentro do `<main>`**, antes das `<Tabs>`, e ajustar o layout para que ele apareca entre o header e as tabs.

### Alteracao em `src/pages/FabricaRacao.tsx`

1. Remover o `<CommodityTicker>` da posicao atual (linha 390, entre `</header>` e `<main>`)
2. Colocar dentro do `<main>`, logo antes do `<Tabs>`, para que herde o padding-top que ja compensa o header fixo

```
<main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
  <CommodityTicker integradoId={integradoId} />   <!-- movido para ca -->
  <Tabs ...>
```

Apenas 2 linhas alteradas. Nenhuma outra mudanca necessaria.
