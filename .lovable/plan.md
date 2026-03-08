

# Auditoria Gestão de Campo — Funções Duplicadas, Bugs e Inconsistências

## 1. FUNÇÕES DUPLICADAS

### 1.1 `getLinhagemLabel` — 5 cópias idênticas
Mesma função copiada em:
- `src/pages/GestaoCampo.tsx` (linha 238)
- `src/pages/MeusLotes.tsx` (linha 426)
- `src/hooks/useLoteAnalytics.tsx` (linha 108)
- `src/components/campo/DesempenhoTable.tsx` (linha 22)
- `src/components/lotes/FechamentoLoteDialog.tsx` (linha 220)

**Correção**: Extrair para `src/lib/utils/labels.ts` e importar.

### 1.2 `getStatusBadge` (lotes) — 4 versões inconsistentes
| Arquivo | Status mapeados |
|---|---|
| `GestaoCampo.tsx` | previsao, agendado, alojado, em_producao, jejum, saiu_para_entrega, abatido, fechado |
| `MeusLotes.tsx` | previsao, saiu_para_entrega, alojado, fechado (falta jejum, agendado, abatido) |
| `LoteDetalhe.tsx` | previsao, saiu_para_entrega, alojado, fechado (mesma versão incompleta) |
| `VeterinarioLote.tsx` | previsao, alojado, em_producao, fechado (falta saiu_para_entrega, jejum) |

Status como `jejum`, `abatido`, `agendado` e `em_producao` não são reconhecidos em todas as páginas, causando badge genérico sem estilo.

**Correção**: Extrair para `src/lib/utils/labels.ts` com mapeamento completo.

### 1.3 Query `desempenho_aves` sem filtro de `integrado_id`
Em **GestaoCampo.tsx** (linha 142) e **useLoteAnalytics.tsx** (linha 225), a tabela `desempenho_aves` é carregada com `select('*')` **sem filtro de integrado_id**. Isso puxa dados de desempenho de TODAS as organizações.

Outros componentes (PesagemDialog, MetasPesoLote, etc.) filtram corretamente por `linhagem` e `sexo`, mas não por `integrado_id` — provavelmente porque a tabela é global por design. Mas precisa confirmar se há dados custom por organização.

---

## 2. BUGS

### 2.1 CRÍTICO — `MeusLotes.tsx` faz N+1 queries (até 7 por lote)
Para cada lote, `fetchLotes` faz queries individuais:
1. `pesagens` (última pesagem)
2. `recebimento_lotes`
3. `mortalidade` + `mortalidade_itens`
4. `solicitacoes_racao`
5. `observacoes_lote` (count)
6. `tratamentos_lote` (count)
7. `producao_ovos` (2 queries para postura)

Com 20 lotes = **140+ queries** sequenciais. Causa lentidão extrema no carregamento.

**Correção**: Buscar dados em batch (`WHERE lote_id IN (...)`) e processar no cliente, como já faz `useLoteAnalytics`.

### 2.2 MÉDIO — `avesVivas` calculado de forma diferente em cada local
| Local | Fórmula |
|---|---|
| `MeusLotes.tsx` | `(quantidadeAlojada ?? quantidade_aves) - mortalidadeAcumulada` — desconta mortos no recebimento + mortalidade diária |
| `useLoteAnalytics.tsx` | `quantidade_aves - mortalidadeTotal` — ignora mortos no recebimento |
| `LoteDetalhe.tsx` | `quantidadeAlojada ?? quantidade_aves` — ignora mortalidade diária acumulada |
| `LoteDashboardTab.tsx` | `avesAlojadas - mortalidadeTotal` — ignora recebimento |

O cálculo correto deveria ser: `(quantidade_aves - mortos_recebimento) - mortalidade_acumulada_diaria`

Somente `MeusLotes.tsx` faz isso corretamente. Os outros 3 têm bugs.

### 2.3 MÉDIO — `LoteDashboardTab` usa `consumo_min`/`consumo_max` de colunas que não existem
Linha 90-91 tenta acessar `metasData[consumo_${suffix}_min]` e `consumo_${suffix}_max`, mas a tabela `metas_zootecnicas` não tem essas colunas (conferido no schema das funções). O valor sempre cai no fallback (100, 180).

### 2.4 BAIXO — `LoteDashboardTab` usa `differenceInDays` em vez de `calcularIdadeLote`
`LoteDashboardTab` (linha 48) calcula idade com `differenceInDays(new Date(), new Date(data_alojamento))`. `MeusLotes.tsx` e `LoteDetalhe.tsx` usam `calcularIdadeLote()` que provavelmente tem lógica de "Dia 1 = dia do alojamento". Inconsistência na contagem de dias.

---

## 3. INCONSISTÊNCIAS DE DADOS

### 3.1 Consumo real vs estimado no Dashboard
O `useLoteAnalytics` (linha 248-260) calcula consumo real do silo como `totalRecebido - nivelSilo`. Mas:
- Não filtra `parcialmente_devolvido`
- Não desconta `quantidade_devolvida_kg`
- Usa `nivel_estimado_kg` do último registro, que pode ser antigo

Mesmo problema identificado na auditoria de silo que já foi corrigido no `NivelSiloCard`, mas **não propagado** para o `useLoteAnalytics`.

### 3.2 CA calculado com fórmula diferente no Dashboard vs Pesagem
- `useLoteAnalytics` (linha 319): `CA = consumoRealKg / (pesoAtual * avesVivas)` — usa peso médio × aves vivas
- `PesagemDialog`: Grava `conversao_alimentar` no banco com `consumo_real_kg / massa_total_ganho`

São fórmulas subtilmente diferentes (massa total vs massa ganho — a diferença é o peso do pintinho inicial).

---

## PLANO DE CORREÇÃO

### Prioridade 1 (Crítico)
1. **Refatorar `MeusLotes.tsx` fetchLotes** — Batch queries com `WHERE lote_id IN (...)` em vez de N+1
2. **Unificar cálculo de `avesVivas`** — Criar função `calcularAvesVivas(quantidade_aves, recebimento, mortalidade)` e usar em todos os locais

### Prioridade 2 (Médio)  
3. **Extrair `getLinhagemLabel` e `getStatusBadge`** para `src/lib/utils/labels.ts` com mapeamento completo
4. **Propagar correção de devoluções** do silo para `useLoteAnalytics.getConsumoRealSilo`
5. **Remover acesso a `consumo_min/max`** inexistentes no `LoteDashboardTab`
6. **Unificar cálculo de idade** — usar `calcularIdadeLote` em todos os locais

### Prioridade 3 (Baixo)
7. **Padronizar fórmula de CA** entre dashboard e pesagem

