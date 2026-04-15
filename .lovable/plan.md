

## Plano: Dashboard Consolidado de Mortalidade por Semana

### O que será construído

Um novo componente `GestorMortalidadeSemanal` inserido no `GestorDashboard` (entre Indicadores Estratégicos e Central de Atenção) que mostra uma **matriz visual semana × lote** com indicadores de risco coloridos.

### Estrutura Visual

```text
┌──────────────────────────────────────────────────────────┐
│  📊 Mortalidade Semanal Consolidada                      │
│                                                          │
│  Lote          │ S1    │ S2    │ S3    │ S4    │ Acum.   │
│  ──────────────┼───────┼───────┼───────┼───────┼─────────│
│  Núcleo A1/G1  │ 🟢0.3%│ 🟡0.6%│ 🔴1.2%│  —    │ 0.71%  │
│  Núcleo A1/G2  │ 🟢0.2%│ 🟢0.3%│  —    │  —    │ 0.22%  │
│  Núcleo A2/G3  │ 🟢0.4%│  —    │  —    │  —    │ 0.23%  │
│                                                          │
│  Legenda: 🟢 ≤ meta OK  🟡 meta OK–alerta  🔴 > alerta │
│                                                          │
│  [Barra de mortalidade por motivo: Natural | Eliminado]  │
└──────────────────────────────────────────────────────────┘
```

### Dados

Os dados já existem — o hook `useLoteAnalytics` carrega `mortalidade` e `mortalidade_itens` por lote. O novo componente fará uma query adicional para agrupar mortalidade **por semana** de cada lote ativo, cruzando com `mortalidade_media` para colorir os indicadores.

### Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/campo/GestorMortalidadeSemanal.tsx` | **Novo** — componente com tabela matriz semana×lote, cells coloridas por risco, barra de motivos, e totais acumulados |
| `src/components/campo/GestorDashboard.tsx` | Importar e renderizar `GestorMortalidadeSemanal` entre camadas 3 e 4 |

### Detalhes Técnicos

**`GestorMortalidadeSemanal`** recebe `analytics: LoteAnalytics[]` e `integradoId`:

1. Query `mortalidade` + `mortalidade_itens` de todos os lotes ativos, agrupando por semana (dia 1-7 = S1, 8-14 = S2, etc.)
2. Query `mortalidade_media` para obter referência esperada por semana/linhagem/sexo
3. Cada célula mostra o % de mortalidade da semana com cor:
   - Verde: ≤ referência esperada
   - Amarelo: até 150% da referência
   - Vermelho: > 150% da referência
4. Coluna final "Acumulado" com % total e badge de status
5. Linha de resumo inferior com totais por motivo (natural vs eliminado) em mini-barras
6. Clique na célula abre `MortalidadeSemanaDetalheDialog` já existente

