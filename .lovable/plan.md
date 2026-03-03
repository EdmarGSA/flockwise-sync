

## Checklist de Inconsistências — Módulo Gestão de Campo

### 1. `peso_liquido_g`: Inconsistência grave na interpretação do campo

O campo `peso_liquido_g` da tabela `pesagem_itens` é tratado de forma **contraditória** em diferentes arquivos:

| Arquivo | Tratamento | Resultado |
|---------|-----------|-----------|
| `LoteDashboardTab.tsx` (linha 156) | `totalPeso / totalAves / 1000` | Trata como **gramas** |
| `LoteEditForm.tsx` (linha 168) | `totalPeso / totalAves / 1000` | Trata como **gramas** |
| `useLoteAnalytics.tsx` (linha 291) | `totalPeso / totalAves` (sem /1000) + comentário "armazenado em kg" | Trata como **kg** |
| `MetasVetTab.tsx` (linha 167) | `totalPeso / totalAves` (sem /1000) | Trata como **kg** |
| `MetasPosturaVetTab.tsx` (linha 108) | `totalPeso / totalAves` (sem /1000) | Trata como **kg** |
| `PesagemDetalheDialog.tsx` (linha 196) | Exibe direto como "g" no label | Trata como **gramas** |

**Impacto**: O Dashboard do Lote (`LoteDashboardTab`) e o formulário de edição (`LoteEditForm`) dividem por 1000, gerando pesos 1000x menores que o real se o campo já estiver em kg. Os gauges de Mortalidade/CA/Peso do dashboard individual ficam inconsistentes com o Dashboard do Gestor.

**Correção**: Alinhar todos os arquivos para o mesmo tratamento. Dado que `MetasVetTab` (corrigido recentemente) e `useLoteAnalytics` já tratam como kg, os arquivos `LoteDashboardTab.tsx` e `LoteEditForm.tsx` precisam **remover a divisão por 1000**.

---

### 2. `desempenho_aves`: Query sem filtro `integrado_id`

**Arquivo**: `GestaoCampo.tsx` (linha 142) e `useLoteAnalytics.tsx` (linha 225)

```typescript
supabase.from('desempenho_aves').select('*').order('dia', { ascending: true })
```

Ambas as queries buscam **todos** os registros de desempenho sem filtrar por organização. Isso causa:
- Vazamento de dados entre organizações (violação de isolamento multi-tenant)
- Dados incorretos se duas organizações cadastrarem linhagens com parâmetros diferentes

**Correção**: Adicionar `.eq('integrado_id', integradoId)` em ambas as queries.

---

### 3. Filtro de lotes por tipo de produção usa comparação por nome de galpão

**Arquivo**: `GestaoCampo.tsx` (linhas 263-268)

```typescript
const getLoteTipoProducao = (lote: Lote) => {
  const galpao = galpoes.find(g => g.nome === lote.galpao?.nome); // ← compara por NOME
  ...
};
```

Usa `galpao.nome` para localizar o galpão, o que falha se dois galpões tiverem o mesmo nome em núcleos diferentes. Deveria usar `galpao_id` mas o `Lote` interface não inclui esse campo.

**Correção**: Incluir `galpao_id` na query de lotes e filtrar por ID.

---

### 4. Galpões: Query com filtro em tabela join pode retornar resultados incompletos

**Arquivo**: `GestaoCampo.tsx` (linha 136)

```typescript
supabase.from('galpoes').select('*,nucleo:nucleos(nome)').eq('nucleo.integrado_id', integradoId)
```

O filtro `.eq('nucleo.integrado_id', integradoId)` filtra na relação join. No PostgREST, isso pode retornar galpões com `nucleo: null` em vez de excluí-los, dependendo do tipo de join. O correto seria usar `!inner` para forçar inner join:

```typescript
.select('*,nucleo:nucleos!inner(nome)').eq('nucleos.integrado_id', integradoId)
```

---

### 5. Status `getStatusBadge` não cobre todos os status possíveis

**Arquivo**: `GestaoCampo.tsx` (linhas 223-231)

Só mapeia `previsao`, `alojado`, `fechado`. Faltam:
- `saiu_para_entrega`
- `jejum`
- `abatido`

Lotes nesses status aparecem com o texto cru do enum.

---

### 6. Dashboard de Lote individual: `consumo` usa `avesAlojadas` em vez de `avesVivas`

**Arquivo**: `LoteDashboardTab.tsx` (linha 133)

```typescript
const consumoEstimado = (desempenhoData[0].consumo_acumulado_racao_g * avesAlojadas) / 1000;
```

Usa `avesAlojadas` (quantidade original) para estimar consumo, mas deveria usar `avesVivas` (descontando mortalidade) para refletir o consumo real.

---

### 7. `useLoteAnalytics`: Peso de referência em gramas dividido por 1000, mas `pesoAtual` pode estar em unidade diferente

**Arquivo**: `useLoteAnalytics.tsx` (linha 300)

```typescript
const pesoReferencia = desempenhoRef?.peso_g ? desempenhoRef.peso_g / 1000 : 0;
```

O `peso_g` da tabela `desempenho_aves` é dividido por 1000 para converter para kg. Mas o `pesoAtual` (linha 291) assume `peso_liquido_g` já está em kg. Se ambos estiverem corretos, ok. Mas se `peso_liquido_g` realmente estiver em gramas, o `pesoVsMeta` será completamente errado (comparando gramas com kg).

**Este é o ponto central**: é preciso verificar qual unidade `peso_liquido_g` realmente armazena e padronizar em **todos** os arquivos.

---

### Resumo de Ações

| # | Prioridade | Ação |
|---|-----------|------|
| 1 | **Crítica** | Padronizar `peso_liquido_g` em `LoteDashboardTab` e `LoteEditForm` (remover `/1000`) |
| 2 | **Alta** | Adicionar `integrado_id` filter em queries de `desempenho_aves` |
| 3 | **Média** | Usar `galpao_id` em vez de `galpao.nome` para filtro de lotes |
| 4 | **Média** | Usar `!inner` join na query de galpões |
| 5 | **Baixa** | Completar mapeamento de status no badge |
| 6 | **Baixa** | Corrigir cálculo de consumo estimado para usar `avesVivas` |

