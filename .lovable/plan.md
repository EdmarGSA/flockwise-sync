

# Auditoria de Cálculos de Nível de Silo — Inconsistências Encontradas

## Resumo das Inconsistências

### 1. CRÍTICO — Três implementações diferentes do cálculo de nível

O nível do silo é calculado em **3 lugares independentes** com lógicas sutilmente diferentes:

| Local | Arquivo | Método |
|---|---|---|
| A | `NivelSiloCard.tsx` (componente) | `consumo_acumulado_racao_g` × avesVivas |
| B | `NivelSiloCard.tsx` (`useSiloLevel` hook) | Mesma fórmula, mas código duplicado |
| C | `GestaoConsumo.tsx` (`fetchLotes`) | Mesma fórmula, código duplicado pela 3ª vez |

Qualquer correção futura precisa ser aplicada em 3 lugares. Deveria existir **uma única função utilitária** compartilhada.

---

### 2. ALTO — Consumo usa `consumoDiarioKg` fixo do dia atual para projetar consumo desde o histórico

Em todos os 3 locais, quando existe `historico_nivel_silo`, o consumo desde o registro é calculado assim:

```
consumoDesdeHistorico = consumoDiarioKg_do_dia_atual × diasDecorridos
```

**Problema**: O consumo diário de ração muda significativamente dia a dia (ex: dia 7 = 25g/ave, dia 28 = 170g/ave). Se o histórico foi registrado há 5 dias, o cálculo usa o consumo do dia 28 para os 5 dias, quando deveria somar os consumos dos dias 24, 25, 26, 27, 28 individualmente.

**Impacto**: Superestima o consumo (e portanto subestima o nível do silo) — quanto maior o intervalo entre registros, maior o erro.

**Correção**: Somar `consumo_diario_racao_g` para cada dia do intervalo (como já faz o `NivelSiloUpdateForm` na linha 210-221 — que é a implementação correta).

---

### 3. MÉDIO — `NivelSiloCard` não filtra devoluções no cálculo pós-histórico

No `NivelSiloCard.tsx` (linha 140-152), ao buscar ração recebida após o histórico:
```typescript
.eq('status', 'recebido')
```

Mas no cálculo do `totalRecebido` (linha 69-76), considera `recebido` **e** `parcialmente_devolvido`, descontando devoluções confirmadas. O cálculo pós-histórico **ignora** parcialmente devolvidos e **não desconta** devoluções.

O `useSiloLevel` hook (linha 444-450) tem o mesmo problema parcialmente — filtra `recebido` e `parcialmente_devolvido` mas **não desconta** `quantidade_devolvida_kg`.

---

### 4. MÉDIO — `NivelSiloUpdateForm` usa `diasDesdeAlojamento` atual para cálculos retroativos

Quando o usuário seleciona uma data retroativa (ex: 3 dias atrás), o formulário calcula o nível esperado usando `diasDesdeAlojamento` **atual** (linha 166, 217), não o valor que era correto na data selecionada.

Comentário no próprio código admite: `// (simplified: use current diasDesdeAlojamento as approximation)` (linha 159).

---

### 5. BAIXO — `Math.floor` no `diasRestantes` perde precisão

Todos os cálculos usam `Math.floor(nivelSilo / consumoDiarioKg)`. Se há 0.8 dias de estoque, mostra `0 dias` e dispara alarme "Déficit", quando na verdade ainda há ração para ~19 horas.

---

### 6. BAIXO — `SilosMapSection` usa thresholds hardcoded diferentes do `config_silo`

O componente `SilosMapSection.tsx` (linha 52-70) usa thresholds fixos (`diasEstoque < 1` = crítico, `<= 3` = atenção) em vez de usar os valores configuráveis do `useConfigSilo` (`diasCritico`, `diasAtencao`). O mesmo ocorre em `RiscoEstoqueCard.tsx` (filtra `diasEstoque >= 1 && <= 3` fixo).

---

### 7. BAIXO — Divergência acumulada soma TODOS os registros do galpão (não filtra por lote)

No `NivelSiloCard.tsx` (linha 112-122), a query de `allHistorico` filtra por `galpao_id` mas **não filtra por `lote_id`**. Se um galpão teve múltiplos lotes ao longo do tempo, a divergência acumulada soma registros de lotes anteriores.

---

## Plano de Correção (por prioridade)

1. **Extrair cálculo para função utilitária** — Criar `src/lib/utils/calcularNivelSilo.ts` com a lógica unificada, eliminando as 3 cópias
2. **Corrigir consumo pós-histórico** — Somar consumo diário por dia do intervalo (não multiplicar consumo fixo × dias)
3. **Unificar filtro de devoluções** — Aplicar a mesma lógica de `totalRecebido` no cálculo pós-histórico
4. **Usar thresholds do `config_silo`** no `SilosMapSection` e `RiscoEstoqueCard`
5. **Filtrar divergência por `lote_id`** no `NivelSiloCard`
6. **Corrigir `diasDesdeAlojamento` retroativo** no `NivelSiloUpdateForm`

