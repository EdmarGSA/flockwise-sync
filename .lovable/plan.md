

## Histórico de Temperatura Diário (Min/Máx) na Página de Metas do Lote

### O que será feito

Adicionar uma seção "Histórico de Temperatura" na página `MetasPesoLote` que mostra, para cada dia desde o alojamento, a temperatura mínima e máxima registrada pelos sensores do galpão, junto com o horário de cada ocorrência. Inclui um gráfico de linha (min/max por dia) e uma tabela com os dados detalhados.

### Como funciona

1. A partir do `lote_id`, buscar o `galpao_id` do lote
2. Buscar os `dispositivos_iot` vinculados ao galpão
3. Buscar todas as `leituras_sensores` desses dispositivos desde a `data_alojamento`
4. Agrupar por dia no frontend: calcular min/max de `temperatura_c` e guardar o `created_at` (horário) de cada extremo
5. Se houver `regras_temperatura_lote` configuradas, plotar a faixa ideal como área de referência no gráfico

### Arquivos a editar

**`src/pages/MetasPesoLote.tsx`**
- Incluir `galpao_id` no select do lote (já busca `galpao:galpoes(nome)`, basta adicionar o campo)
- Novo state para dados de temperatura diários
- Nova query em `fetchData` para buscar leituras de sensores e regras de temperatura
- Processar dados: agrupar por dia, extrair min/max com horários
- Nova seção no render com:
  - Gráfico Recharts `LineChart` com linhas de min e max, e área de faixa ideal (se houver regras)
  - Tabela responsiva: Dia | Data | Mín (°C) | Horário Mín | Máx (°C) | Horário Máx | Status (dentro/fora da faixa)

### Detalhes técnicos

- Query de leituras: `leituras_sensores` filtrado por `dispositivo_id IN (devices do galpão)` e `created_at >= data_alojamento`, sem limite de 1000 rows (usar paginação se necessário)
- Agrupamento feito no frontend por `date` (YYYY-MM-DD) do `created_at`
- Para cada dia, `Math.min/max` sobre `temperatura_c`, armazenando o `created_at` correspondente
- Faixa ideal vem de `regras_temperatura_lote` mapeada pelo dia de idade do lote
- Ícones de alerta para dias onde min ou max ficaram fora da faixa

