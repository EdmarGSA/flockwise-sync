

## Plano: Melhorias no Acompanhamento Veterinário de Lotes

### Problema Atual

O módulo veterinário apresenta alertas básicos de mortalidade (apenas % acumulado vs limiar) sem cruzar dados ambientais, pesagens e padrões de mortalidade para identificar divergências e discrepâncias. Falta:
1. Alertas que correlacionem picos de mortalidade com divergências de temperatura/umidade no período
2. Detecção de discrepâncias nas pesagens de mortalidade (peso registrado vs esperado pela linhagem/idade)
3. Visão consolidada de divergências ambientais durante períodos de mortalidade elevada

### O Que Será Construído

#### 1. Painel de Divergências por Lote (novo componente)
Card expandível em `VeterinarioLote.tsx` que mostra:

```text
┌─────────────────────────────────────────────────┐
│ 🔍 Diagnóstico do Lote                         │
├─────────────────────────────────────────────────┤
│ MORTALIDADE                                     │
│ Acumulada: 1.2% (ref: 0.8%) ⚠️                 │
│ Tendência: ↗ Subindo  │  Ratio Elim/Nat: 1.8x  │
├─────────────────────────────────────────────────┤
│ PESAGEM vs MORTALIDADE                          │
│ Peso médio mortalidade: 0.95 kg                 │
│ Peso médio lote (última pesagem): 1.55 kg       │
│ Discrepância: -38.7% ⚠️ aves menores morrendo  │
├─────────────────────────────────────────────────┤
│ AMBIENTE (últimos 7 dias)                       │
│ Temp fora da faixa: 3 dias  🔴                  │
│ Umidade fora da faixa: 2 dias                   │
│ Pior desvio: +5.2°C em 12/04                    │
│ Correlação: mortalidade subiu 40% nos dias com  │
│ temperatura fora da faixa                       │
└─────────────────────────────────────────────────┘
```

#### 2. Alertas Inteligentes Enriquecidos (VeterinarioDashboard)
Novos tipos de alertas no dashboard geral:
- **Divergência ambiental + mortalidade**: "Lote X teve 3 dias com temperatura fora da faixa na última semana e mortalidade 50% acima da referência"
- **Discrepância peso mortalidade**: "Peso médio das aves mortas (0.95kg) é 38% menor que o peso do lote (1.55kg) — mortalidade seletiva em aves menores"
- **Correlação temporal**: detectar se picos de mortalidade coincidem com períodos de divergência ambiental

#### 3. Enriquecimento da Análise de Mortalidade (Edge Function)
Adicionar no briefing determinístico:
- Buscar leituras IoT dos últimos 3 dias (não apenas instantânea) para detectar padrões
- Comparar peso registrado na mortalidade (`pesoKg`) com peso médio do lote pela última pesagem
- Incluir contagem de dias com temperatura fora da faixa na semana

### Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/veterinario/DiagnosticoLoteCard.tsx` | **Novo** — componente que busca e exibe divergências de mortalidade, peso e ambiente para um lote específico |
| `src/pages/VeterinarioLote.tsx` | Importar e renderizar `DiagnosticoLoteCard` entre os alertas e os cards de info |
| `src/components/veterinario/VeterinarioDashboard.tsx` | Enriquecer `gerarAlertas()` com novos tipos: divergência ambiental correlacionada com mortalidade, discrepância de peso na mortalidade |
| `supabase/functions/analise-mortalidade/index.ts` | Buscar leituras IoT dos últimos 3 dias (não só instantânea), comparar peso da mortalidade vs peso médio do lote, incluir dias fora da faixa na análise |

### Detalhes Técnicos

**`DiagnosticoLoteCard`** — queries no mount:
1. `mortalidade` + `mortalidade_itens` do lote → acumulado, tendência, ratio eliminados/naturais, peso médio das aves mortas (campo `peso_kg` dos itens)
2. Última `pesagens` + `pesagem_itens` → peso médio atual do lote
3. `desempenho_aves` → peso referência para linhagem/sexo/dia
4. `leituras_sensores` via `dispositivos_iot` do galpão (últimos 7 dias) → contagem de dias fora da faixa, pior desvio
5. `regras_temperatura_lote` → faixa ideal por idade
6. Correlação: cruzar datas com mortalidade alta vs datas com temperatura fora da faixa

**`VeterinarioDashboard` — novos alertas**:
- Query adicional de `leituras_sensores` agrupada por lote/galpão nos últimos 7 dias
- Detectar lotes onde dias fora da faixa > 2 E mortalidade > referência → alerta de correlação ambiental
- Comparar peso médio mortalidade vs peso médio lote → alerta de discrepância

**Edge Function `analise-mortalidade`** — enriquecimentos:
- Buscar `leituras_sensores` dos 3 dias anteriores ao registro (não só última leitura)
- Calcular: dias fora da faixa, temperatura média, amplitude térmica
- Comparar `peso_kg` do item de mortalidade vs `pesoMedioReal` da última pesagem
- Adicionar ao briefing: "Ambiente esteve fora da faixa em X dos últimos 3 dias" e "Peso das aves mortas Y% diferente do peso médio do lote"

