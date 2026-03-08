

# Dashboard Visão Geral — Módulo Veterinário

## Objetivo
Adicionar um dashboard sintético na página `/veterinario` com gráficos e KPIs consolidados de todos os lotes, usando o hook `useLoteAnalytics` já existente (mesmo usado na Gestão de Campo).

## Estrutura

A página `Veterinario.tsx` ganhará **duas abas**: "Visão Geral" (dashboard novo) e "Lotes" (lista atual).

### Componente novo: `src/components/veterinario/VeterinarioDashboard.tsx`

**KPI Cards (4 cards compactos no topo):**
- Total de aves vivas (soma)
- Mortalidade média geral (%)
- CA médio geral
- Lotes com alerta (count)

**Gráficos (usando Recharts, já instalado):**

1. **Mortalidade por Lote** — BarChart horizontal: cada lote com % mortalidade, colorido por status (OK verde, alerta amarelo, crítico vermelho)
2. **Peso Real vs Referência** — BarChart agrupado: por lote, barras lado a lado (peso real × peso referência)
3. **Score Operacional** — RadialBarChart ou PieChart: distribuição dos lotes por status (OK / Atenção / Crítico)
4. **Tratamentos Ativos** — Card com contagem de tratamentos ativos e lotes em carência

### Dados
- Reutilizar `useLoteAnalytics` para mortalidade, CA, peso, score
- Batch query adicional para `tratamentos_lote` (status = 'ativo') agrupado
- Usar `mortalidadeMap` e `carenciaMap` já existentes na página

### Mudanças em `Veterinario.tsx`
- Adicionar `Tabs` (Visão Geral | Lotes) abaixo do header
- Tab "Visão Geral" renderiza `<VeterinarioDashboard />`
- Tab "Lotes" mantém o conteúdo atual (filtros + cards)
- Usar labels unificados de `src/lib/utils/labels.ts`
- Remover funções duplicadas `formatLinhagem`, `formatSexo`, `getStatusBadge` locais

### Arquivos
| Ação | Arquivo |
|---|---|
| Criar | `src/components/veterinario/VeterinarioDashboard.tsx` |
| Editar | `src/pages/Veterinario.tsx` |

