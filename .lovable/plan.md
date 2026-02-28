

## Alerta de Mortalidade na Tela Veterinário (Lista de Lotes)

### Contexto
A tabela `mortalidade` registra mortalidade por lote, e `mortalidade_itens` contém a quantidade de aves mortas. A tabela `metas_zootecnicas` define limiares de alerta por faixa de idade (ex: `mortalidade_7_dias_alerta`, `mortalidade_14_dias_alerta`, etc.).

### Plano

**1. `src/pages/Veterinario.tsx` - Adicionar indicador de mortalidade nos cards de lote**

- Na função `fetchLotes`, além de buscar observações e alertas, buscar também:
  - Total de mortalidade acumulada por lote (sum de `mortalidade_itens.quantidade` via join com `mortalidade`)
  - Metas zootécnicas do integrado para comparar com limiares de alerta
- Calcular `% mortalidade = total_mortos / quantidade_aves * 100`
- Comparar com o limiar de alerta da faixa de idade correspondente (`mortalidade_X_dias_alerta`)
- Adicionar campo `mortalidade_alerta: boolean` e `mortalidade_percentual: number` ao estado do lote

- No card de cada lote, quando `mortalidade_alerta === true`:
  - Exibir badge com ícone `Skull` ou `AlertTriangle` em vermelho com o percentual de mortalidade
  - Adicionar borda visual similar aos alertas existentes

**2. `src/pages/VeterinarioLote.tsx` - Adicionar card de mortalidade na tela de detalhe**

- Buscar mortalidade acumulada do lote e meta zootécnica
- Adicionar um card de alerta (usando componente `Alert` destructive) acima dos botões de ação quando mortalidade estiver acima do limiar
- Mostrar: percentual atual vs limiar, total de aves mortas

### Lógica de faixa de idade
Mapear dias do lote para a faixa correta:
- 0-7 dias → `mortalidade_7_dias_alerta`
- 8-14 dias → `mortalidade_14_dias_alerta`
- 15-21 dias → `mortalidade_21_dias_alerta`
- 22-28 dias → `mortalidade_28_dias_alerta`
- 29-35 dias → `mortalidade_35_dias_alerta`
- 36+ dias → `mortalidade_42_dias_alerta`

