## Problema

Decisões e exibição de temperatura/umidade do galpão usam **média simples** + **mín/máx absolutos** de todos os sensores ativos. Dois vieses:

1. **Fase de pinteiro**: aves ficam confinadas em ¼ do galpão (área aquecida). Sensores fora dessa zona puxam a média para baixo — sistema acha que está frio quando o pinteiro está OK.
2. **Mín/Máx absolutos**: pico de 15 min (porta aberta, descarga de ração, falha já corrigida) vira "mínima do dia" e dispara alertas indevidos.

## Solução em 3 camadas

### 1. Zona do sensor + modo do galpão

- `dispositivos_iot.zona`: enum `pinteiro | engorda | postura | externa | geral` (default `geral`).
- `dispositivos_iot.peso_amostragem`: numérico 0.0–2.0 (default 1.0) — reduzir peso de sensor ruim sem desativar.
- Derivar **modo ativo** do lote por idade:
  - dias `1..dias_fim_pinteiro` → usa sensores `zona ∈ {pinteiro, geral}`.
  - dias seguintes → usa `zona ∈ {engorda, postura, geral}` conforme `tipo_producao` do núcleo.
  - Sensores fora da zona ativa ficam **visíveis** mas marcados "fora da zona ativa" e **não entram** na média/automação.

### 2. Métricas robustas (substituem mín/máx puros)

Por dia, calcular:
- **Mediana** das leituras.
- **P5 / P95** como "min/max representativos".
- **Tempo acumulado fora da faixa** (min/dia).
- **Min/Max sustentados**: só conta se manteve por ≥ `min_minutos_sustentado` consecutivos.

Mín/Máx absolutos continuam disponíveis como tooltip "ver picos", mas o card padrão e os alertas usam **P5/P95 + tempo fora da faixa + min/max sustentados**.

### 3. Agregação para decisões automáticas (fase 2)

Inicialmente **só a visualização** muda. Automação (`climate-brain`, `auto-*`) entra em uma 2ª fase após validar 1 ciclo, atrás da flag `usar_percentis_automacao`.

Quando ligar:
- Filtrar leituras pela zona ativa do lote.
- Aplicar `peso_amostragem` na média.
- Média móvel das últimas 15 min + descartar outliers via IQR.
- Logar em `log_decisao_clima.reason_chain`: `"zona_ativa=pinteiro, sensores_usados=2/5"`.

## Configuração (respostas do usuário)

- **Zonas**: `pinteiro | engorda | postura | externa | geral`. Sem entrada/saída/centro.
- **Dias de pinteiro**: configurável.
  - Default global por `integrado_id` em `config_zonas_galpao.dias_fim_pinteiro` (default 14).
  - Override por **lote** em `lotes.dias_fim_pinteiro` (nullable) — quando preenchido, prevalece.
  - UI permite ajustar no cadastro/edição do lote.
- **Min/Máx sustentado**: configurável.
  - `config_zonas_galpao.min_minutos_sustentado` (default 20, range 5–60).
- **IQR/automação**: **fase 2**. Por ora, flag `usar_percentis_automacao = false` no default. Automação continua usando média simples por enquanto.

## Mudanças por arquivo

**Migration**
- `ALTER TABLE dispositivos_iot ADD zona text DEFAULT 'geral', ADD peso_amostragem numeric DEFAULT 1.0` + CHECK em zona.
- `ALTER TABLE lotes ADD dias_fim_pinteiro int NULL`.
- `CREATE TABLE config_zonas_galpao (integrado_id PK, dias_fim_pinteiro int DEFAULT 14, min_minutos_sustentado int DEFAULT 20, usar_percentis_automacao bool DEFAULT false)` + RLS por `integrado_id`.

**Utilitários novos**
- `src/lib/utils/agregarLeituras.ts`: `mediana`, `percentil(arr, p)`, `removerOutliersIQR`, `minMaxSustentado(arr, minMin)`, `tempoForaFaixa(arr, min, max)`.
- `src/hooks/useConfigZonas.tsx`: lê `config_zonas_galpao` + override do lote.

**Visualização (fase 1 — entra agora)**
- `src/components/lotes/historico-temp/useHistoricoData.ts`: 
  - JOIN com `dispositivos_iot` para pegar `zona`.
  - Resolver zona ativa via idade do lote × `dias_fim_pinteiro` (lote ou config).
  - Filtrar leituras pela zona ativa.
  - Calcular mediana, p5, p95, min/max sustentados, tempo fora da faixa.
- `src/lib/utils/calcularMinMaxDia.ts`: adicionar campos novos mantendo `min/max` para compat.
- `src/hooks/useTemperaturaLote.ts`: expor mediana e p5/p95.
- `src/components/lotes/historico-temp/DivergenciaKPIs.tsx`, `TemperaturaChart.tsx`, `UmidadeChart.tsx`, `HistoricoTable.tsx`, `TemperaturaUmidadeCard.tsx`: 
  - Destaque: **Mediana** + faixa **P5–P95**.
  - Nova KPI: **Tempo fora da faixa** (min/h).
  - Badge: "Modo pinteiro – usando X de Y sensores".
  - Mín/Máx absolutos viram tooltip "Picos do dia".

**UI de configuração**
- `DispositivosIoT.tsx`: dropdown "Zona" + slider "Peso amostragem" por sensor.
- `ConfiguracaoAlertasClima.tsx` (ou nova seção em Configuracoes): `dias_fim_pinteiro`, `min_minutos_sustentado`, `usar_percentis_automacao`.
- `LoteEditForm.tsx`: campo opcional "Dias de pinteiro deste lote" com placeholder "Padrão da organização (Xd)".

**Fase 2 (depois de validar 1 ciclo — NÃO entra agora)**
- `climate-brain/index.ts` + `auto-temperatura/auto-ventilacao/auto-cortina/auto-nebulizacao`: aplicar filtro de zona, peso, IQR. Atrás da flag `usar_percentis_automacao`.
- `relatorio-lote-diario`: passar a reportar mediana/p5/p95/tempo fora da faixa.

## Rollout

1. Migration + defaults seguros (`zona='geral'` mantém comportamento atual em automação).
2. Utilitários + hook de config.
3. Atualizar visualização (`useHistoricoData` + cards + tabela).
4. UI para classificar zona dos sensores + configuração da org + override por lote.
5. (Fase 2 futura) Ativar filtros na automação após 1 ciclo de validação.

Confirma para implementar a Fase 1?
