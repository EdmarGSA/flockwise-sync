# Relatório Diário do Lote + Analista Técnico IA

Nova tela no módulo veterinário que mostra, por dia, todo o histórico do lote (clima, iluminação, mortalidade, pesagem, referência da linhagem) e gera uma análise técnica por IA usando os dados do próprio sistema, sem alucinação.

## Escopo

**Rota:** `/veterinario/:loteId/relatorio-diario` (botão "Relatório Diário" em `VeterinarioLote.tsx`)

**3 abas:** Diário · Análise IA · Exportar

### Aba Diário
Tabela por dia (alojamento → hoje), paginação semanal no desktop (`< Semana 3 >`), scroll vertical no mobile:
- Data + idade (dias/semanas)
- Clima por dispositivo IoT: temp/umid min/máx/média + faixa ideal da linhagem
- Iluminação: horas programadas, acender/apagar, overrides do dia
- Mortalidade: natural + eliminada (unidades e % acumulado)
- Pesagem: peso médio, CV%, ganho diário; marcador a cada 7 dias com o padrão da linhagem
- Coluna "vs Padrão": delta de peso e mortalidade vs Lohmann/Cobb/Ross

**Matriz de dados ausentes:**
| Caso | Renderização |
|---|---|
| Sensor offline o dia inteiro | célula cinza + "—" + tooltip "sensor offline" |
| Sensor parcial (<6h de dados) | valor + ícone amarelo de aviso |
| Sem pesagem no dia | "—" (não é erro) |
| Sem mortalidade | "0" (valor válido) |
| Sem iluminação programada | "—" + link "configurar programa" |

### Aba Análise IA
Markdown gerado por `google/gemini-2.5-pro` (temperature 0.3), estruturado em:
1. Resumo executivo (3 linhas)
2. Performance vs linhagem (peso, CA, uniformidade)
3. Tendência de mortalidade e correlação com clima
4. Aderência ao programa de iluminação
5. Sanidade (tratamentos ativos, autópsias, carência)
6. **Recomendações priorizadas** (banner crítico no topo se houver gatilho)
7. Riscos próximos 7 dias

**Camada de gatilhos críticos (determinística, no backend — não na IA):**
| Gatilho | Ação |
|---|---|
| Mortalidade diária > limiar do integrador | banner vermelho + sugerir coleta laboratorial |
| Mortalidade acumulada > 1,5× padrão linhagem | banner laranja + revisar clima |
| 3+ dias fora da faixa térmica | revisar ventilação/aquecimento |
| Peso < 90% do padrão | auditar consumo/ração |
| Medicação com carência ≤2 dias e abate marcado | bloquear abate |
| Autópsia com achado infeccioso | notificar veterinário |

Os gatilhos são detectados no backend, renderizados pelo frontend como banner próprio, e injetados como **contexto factual** no prompt da IA (ela contextualiza, não prioriza).

**Anti-delírio:**
- IA proibida de prescrever dosagens (apenas sugerir consultar veterinário)
- Prompt recebe somente dados reais do JSON do endpoint 1
- Validação pós-resposta: se vier marca/dosagem específica ou `state: failed`, descarta e mostra template determinístico
- Cache em `lotes.analise_ia_relatorio jsonb` com `hash_dados` (não recalcula se nada mudou)

### Aba Exportar
- PDF via `window.print` (CSS print-friendly)
- CSV client-side com os mesmos dados da aba Diário

## Backend

### Edge function `relatorio-lote-diario`
- `?action=diario` — rápido, sem IA. Uma query por: `lotes`, `dispositivos_iot`, `leituras_sensores` (agregado por `date_trunc('day', lido_em)` com janela padrão **60 dias**), `mortalidade` + itens, `pesagens` + itens, `programa_iluminacao_faixa`, `override_iluminacao_canal`, `tratamentos`, `autopsias`. Calcula gatilhos críticos.
- `?action=ia` — chama `?action=diario` internamente, monta prompt com dados + gatilhos, chama Gemini, valida resposta, persiste cache.

### Migração
- Nova RPC `get_benchmark_linhagem(linhagem, sexo, integrado_id)` retornando peso/mortalidade semanal de **lotes fechados** do mesmo integrado:
  - filtro: `status = 'fechado'`
  - mínimo: `quantidade_aves >= 5000`
  - mínimo: 3 lotes na amostra
  - janela: últimos 24 meses
- Coluna `lotes.analise_ia_relatorio jsonb` (cache do markdown + hash + timestamp)

### Fase 2 (não nesta entrega)
Tabela `resumo_diario_sensores` + cron `pg_cron` noturno reagregando D-1 com `INSERT ... ON CONFLICT DO UPDATE`. Decisão: query direta resolve até ~500k linhas (frango corte 42d), postura longa (600d) entra na Fase 2.

## Arquivos

**Novos:**
- `src/pages/VeterinarioRelatorioDiario.tsx`
- `src/components/veterinario/relatorio/TabelaDiaria.tsx`
- `src/components/veterinario/relatorio/AnaliseIATecnica.tsx`
- `src/components/veterinario/relatorio/ExportarRelatorio.tsx`
- `src/components/veterinario/relatorio/BannerGatilhosCriticos.tsx`
- `src/hooks/useRelatorioDiarioLote.ts`
- `src/hooks/useAnaliseIALote.ts`
- `src/lib/veterinario/padroesLinhagem.ts`
- `src/lib/veterinario/gatilhosCriticos.ts`
- `supabase/functions/relatorio-lote-diario/index.ts`

**Editar:**
- `src/pages/VeterinarioLote.tsx` — botão "Relatório Diário"
- `src/App.tsx` — registrar rota

## Fora de escopo
- Tabela `resumo_diario_sensores` + cron (Fase 2)
- Dados externos / cross-integrado benchmark
- Notificação por e-mail/WhatsApp
- Substituir `analise-mortalidade` existente
- Novo schema de sensores/alarmes
