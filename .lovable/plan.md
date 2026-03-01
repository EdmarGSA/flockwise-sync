

## Correção do Peso Total no Histórico de Pesagens

### Problema
O campo `peso_liquido_g` na tabela `pesagem_itens` armazena valores em **kg** (ex: 3.070 kg para 20 aves), apesar do nome sugerir gramas. O código divide por 1000 desnecessariamente, resultando em 0.07 kg ao invés de ~68.69 kg.

### Correção

**Arquivo:** `src/components/veterinario/MetasVetTab.tsx` — linha 175

Alterar:
```typescript
totalPesoKg: totalPeso / 1000
```
Para:
```typescript
totalPesoKg: totalPeso
```

Essa é a única alteração necessária. O `totalPeso` já é a soma dos `peso_liquido_g` que estão em kg.

